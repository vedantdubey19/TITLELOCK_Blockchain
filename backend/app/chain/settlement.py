"""Prepare a wallet transaction; reconcile confirmed chain events into PostgreSQL."""
from datetime import datetime, timezone
import logging

from fastapi import HTTPException
from psycopg.types.json import Jsonb
from psycopg import OperationalError
from web3 import Web3

from ..audit.sales import record_event
from .service import Registry, ownership_state, state_hash, linked_wallet


def prepare_transaction(conn, sale, settings):
    from ..fraud.service import evaluate
    parcel=conn.execute('SELECT * FROM parcels WHERE ulpin=%s FOR UPDATE',(sale['parcel_id'],)).fetchone()
    screening=evaluate(conn,settings,parcel,sale['document_hash'],sale['id'])
    if screening['decision']!='CLEAR':
        raise HTTPException(409,'Current risk checks block transfer completion')
    chain=Registry(settings)
    payload=conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s FOR UPDATE',(sale['id'],)).fetchone()
    if not payload:
        raise HTTPException(409,'Owner and registrar must sign with their linked wallets first')
    old=chain.check(conn,sale['parcel_id'])
    if old!=payload['old_state'] or state_hash(payload['new_state'])!=payload['typed_data']['message']['newHash']:
        raise HTTPException(409,'Database ownership changed after wallet signing')
    # Rebuild the typed message from current deal data to detect payload/deal edits.
    expected_new=old | {'current_owner':str(sale['buyer_user_id']),'ownership_type':'SOLE','owners':[[str(sale['buyer_user_id']),10000]]}
    typed=chain.typed_transfer(sale,old,expected_new,linked_wallet(conn,str(sale['buyer_user_id']),settings),linked_wallet(conn,str(sale['registrar_user_id']),settings))
    if typed!=payload['typed_data'] or expected_new!=payload['new_state']:
        raise HTTPException(409,'Deal details changed after signing')
    from .routes import recover
    wallets=[linked_wallet(conn,owner[0],settings) for owner in old['owners']]
    for address in wallets+[typed['message']['registrar']]:
        signature=payload['signatures'].get(address.lower())
        if not signature or recover(typed,signature)!=address.lower():
            raise HTTPException(409,'Every owner and registrar wallet signature is required')
    if payload['state']=='SIGNING':
        record_event(conn,sale['id'],'BLOCKCHAIN_PREPARED',str(sale['registrar_user_id']))
    conn.execute("UPDATE sale_chain_payloads SET state='PREPARED' WHERE sale_id=%s",(sale['id'],))
    return {'status':'AWAITING_BLOCKCHAIN','transaction':chain.transaction(typed,payload['signatures'],wallets),
            'message':'Approve this test-chain transaction in the assigned registrar wallet. Ownership updates after confirmation.'}


def reconcile_one(repository,settings,sale_id):
    chain=Registry(settings)
    # Network reads before database locks. Never treat an RPC error as confirmation.
    with repository.connect() as conn:
        pending=conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s',(sale_id,)).fetchone()
    if not pending or pending['state'] not in ('PREPARED','SUBMITTED'):
        return
    data=pending['typed_data']['message']
    # Evaluate execution and expiry at the same block, even if mining advances during RPC.
    block=chain.w3.eth.get_block('latest')
    executed=Web3.to_hex(chain.contract.functions.executedDeals(data['dealId']).call(block_identifier=block['number']))
    logs=[]
    if executed!='0x'+'00'*32:
        logs=chain.transfer_logs({'dealId':data['dealId']})
        if not logs or chain.w3.eth.block_number-logs[-1]['blockNumber']+1<settings.chain_confirmations:
            return
    reverted=False
    if pending['tx_hash'] and executed=='0x'+'00'*32:
        from web3.exceptions import TransactionNotFound
        try:
            reverted=chain.w3.eth.get_transaction_receipt(pending['tx_hash'])['status']==0
        except TransactionNotFound:
            pass
    with repository.connect() as conn:
        sale=conn.execute('SELECT parcel_id FROM sale_requests WHERE id=%s',(sale_id,)).fetchone()
        conn.execute('SELECT parcel_id FROM sale_parcel_state WHERE parcel_id=%s FOR UPDATE',(sale['parcel_id'],))
        sale=conn.execute('SELECT * FROM sale_requests WHERE id=%s FOR UPDATE',(sale_id,)).fetchone()
        payload=conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s FOR UPDATE',(sale_id,)).fetchone()
        if payload['state'] not in ('PREPARED','SUBMITTED'):
            return
        if executed=='0x'+'00'*32:
            if block['timestamp']>data['deadline']:
                conn.execute("UPDATE sale_chain_payloads SET state='EXPIRED' WHERE sale_id=%s",(sale_id,))
                conn.execute("UPDATE sale_requests SET status='EXPIRED',registrar_key_hash=NULL WHERE id=%s",(sale_id,))
                conn.execute('UPDATE sale_owner_approvals SET key_hash=NULL WHERE request_id=%s',(sale_id,))
                conn.execute("UPDATE sale_parcel_state SET cooldown_until=to_timestamp(%s)+interval '7 days' WHERE parcel_id=%s",(data['deadline'],sale['parcel_id']))
                record_event(conn,sale_id,'SALE_EXPIRED')
            elif reverted:
                conn.execute("UPDATE sale_chain_payloads SET state='PREPARED',tx_hash=NULL WHERE sale_id=%s",(sale_id,))
                record_event(conn,sale_id,'TRANSFER_FAILED',str(sale['registrar_user_id']),'Local blockchain transaction reverted; retry the registrar wallet transaction')
            return
        conn.execute('SELECT ulpin FROM parcels WHERE ulpin=%s FOR UPDATE',(sale['parcel_id'],))
        conn.execute('SELECT id FROM ownerships WHERE parcel_id=%s AND active FOR UPDATE',(sale['parcel_id'],))
        if not chain.history_matches(conn,sale['parcel_id'],ignore_deal=sale_id) or executed!=data['newHash'] or ownership_state(conn,sale['parcel_id'])!=payload['old_state'] or state_hash(payload['new_state'])!=executed:
            conn.execute("UPDATE sale_chain_payloads SET state='REVIEW' WHERE sale_id=%s",(sale_id,))
            return  # Preserve both records for investigation; never overwrite a mismatching database.
        event=logs[-1]
        timestamp=chain.contract.functions.executedAt(data['dealId']).call()
        when=datetime.fromtimestamp(timestamp,timezone.utc)
        names=conn.execute('SELECT u.display_name FROM sale_owner_approvals a JOIN users u ON u.id=a.registry_user_id WHERE a.request_id=%s ORDER BY u.id',(sale_id,)).fetchall()
        buyer=conn.execute("SELECT u.display_name FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.id=%s AND u.account_status='ACTIVE' AND a.role='CITIZEN' FOR UPDATE OF u,a",(sale['buyer_user_id'],)).fetchone()
        if not buyer:
            conn.execute("UPDATE sale_chain_payloads SET state='REVIEW' WHERE sale_id=%s",(sale_id,))
            return
        conn.execute('DELETE FROM parcel_sale_consents WHERE parcel_id=%s',(sale['parcel_id'],))
        conn.execute('UPDATE ownerships SET active=false WHERE parcel_id=%s AND active',(sale['parcel_id'],))
        conn.execute('INSERT INTO ownerships(parcel_id,user_id,share_bps,active) VALUES (%s,%s,10000,true)',(sale['parcel_id'],sale['buyer_user_id']))
        history=Jsonb([{'from':', '.join(row['display_name'] or 'Owner' for row in names),'to':buyer['display_name'],
            'date':when.date().isoformat(),'doc_hash':sale['document_hash'],'sale_request_id':str(sale_id),'blockchain_tx':Web3.to_hex(event['transactionHash'])}])
        conn.execute("""UPDATE parcels SET current_owner_user_id=%s,ownership_type='SOLE',last_registered_date=%s,
            transfer_history=transfer_history||%s,updated_at=now() WHERE ulpin=%s""",(sale['buyer_user_id'],when.date(),history,sale['parcel_id']))
        conn.execute("UPDATE sale_requests SET status='COMPLETED',completed_at=%s WHERE id=%s",(when,sale_id))
        conn.execute("UPDATE sale_chain_payloads SET state='CONFIRMED',tx_hash=%s,block_number=%s,confirmed_at=now() WHERE sale_id=%s",(Web3.to_hex(event['transactionHash']),event['blockNumber'],sale_id))
        record_event(conn,sale_id,'TRANSFER_COMPLETED',str(sale['registrar_user_id']))


def reconcile_pending(repository,settings):
    if settings.chain_mode!='live':
        return
    with repository.connect() as conn:
        ids=conn.execute("SELECT sale_id FROM sale_chain_payloads WHERE state IN ('PREPARED','SUBMITTED') ORDER BY created_at LIMIT 100").fetchall()
    for row in ids:
        try:
            reconcile_one(repository,settings,row['sale_id'])
        except Exception as failure:
            # Global outages should return to the independent expiry sweep promptly.
            if isinstance(failure,OperationalError) or (isinstance(failure,HTTPException) and failure.status_code==503):
                raise
            logging.getLogger(__name__).warning('Reconciliation failed for sale %s; continuing with other deals',row['sale_id'])
