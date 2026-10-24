"""Submit server-signed transfer receipts and reconcile confirmed chain events."""
from datetime import datetime, timezone
import logging

from fastapi import HTTPException
from psycopg import OperationalError
from psycopg.types.json import Jsonb
from web3 import Web3

from ..audit.sales import record_event
from .service import Registry, hexhash, ownership_state, state_hash


def receipt_data(sale, old, new):
    """The public chain receives commitments, never personal or deed data."""
    return {'message': {
        'dealId': hexhash(str(sale['id'])), 'parcelId': hexhash(sale['parcel_id']),
        'previousHash': state_hash(old), 'newHash': state_hash(new),
        'documentHash': hexhash(sale['document_hash']),
        'deadline': int(sale['expires_at'].timestamp()),
    }}


def prepare_transaction(conn, sale, settings):
    """The server submits one receipt only after the two exchanged keys are approved."""
    from ..fraud.service import evaluate
    parcel = conn.execute('SELECT * FROM parcels WHERE ulpin=%s FOR UPDATE', (sale['parcel_id'],)).fetchone()
    if evaluate(conn, settings, parcel, sale['document_hash'], sale['id'])['decision'] != 'CLEAR':
        raise HTTPException(409, 'Current risk checks block transfer completion')
    chain = Registry(settings)
    payload = conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s FOR UPDATE', (sale['id'],)).fetchone()
    if payload and payload['state'] in ('SUBMITTED', 'CONFIRMED'):
        return {'status': payload['state'], 'tx_hash': payload['tx_hash'], 'message': 'Blockchain receipt is already being confirmed.'}
    if payload and payload['state'] == 'REVIEW':
        raise HTTPException(409, 'Blockchain receipt needs manual review before retrying')

    old = chain.check(conn, sale['parcel_id'])
    new = old | {'current_owner': str(sale['buyer_user_id']), 'ownership_type': 'SOLE',
                 'owners': [[str(sale['buyer_user_id']), 10000]]}
    data = receipt_data(sale, old, new)
    if payload:
        if payload['old_state'] != old or payload['new_state'] != new or payload['typed_data'] != data:
            raise HTTPException(409, 'Database ownership changed after approval; manual review required')
    else:
        conn.execute("""INSERT INTO sale_chain_payloads(sale_id,typed_data,old_state,new_state,state)
                        VALUES (%s,%s,%s,%s,'PREPARED')""",
                     (sale['id'], Jsonb(data), Jsonb(old), Jsonb(new)))
    tx_hash = chain.submit_receipt(data['message']['dealId'], data['message']['parcelId'],
                                   data['message']['previousHash'], data['message']['newHash'],
                                   data['message']['documentHash'])
    conn.execute("UPDATE sale_chain_payloads SET state='SUBMITTED',tx_hash=%s WHERE sale_id=%s", (tx_hash, sale['id']))
    record_event(conn, sale['id'], 'BLOCKCHAIN_SUBMITTED', str(sale['registrar_user_id']))
    return {'status': 'SUBMITTED', 'tx_hash': tx_hash,
            'message': 'TitleLock submitted the blockchain receipt. Ownership updates after confirmation.'}


def reconcile_one(repository, settings, sale_id):
    chain = Registry(settings)
    with repository.connect() as conn:
        pending = conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s', (sale_id,)).fetchone()
    if not pending or pending['state'] not in ('PREPARED', 'SUBMITTED'):
        return
    data = pending['typed_data']['message']
    block = chain.w3.eth.get_block('latest')
    executed = Web3.to_hex(chain.contract.functions.executedDeals(data['dealId']).call(block_identifier=block['number']))
    logs = chain.receipt_logs({'dealId': data['dealId']}) if executed != '0x' + '00' * 32 else []
    if logs and chain.w3.eth.block_number - logs[-1]['blockNumber'] + 1 < settings.chain_confirmations:
        return
    reverted = False
    if pending['tx_hash'] and not logs:
        from web3.exceptions import TransactionNotFound
        try:
            reverted = chain.w3.eth.get_transaction_receipt(pending['tx_hash'])['status'] == 0
        except TransactionNotFound:
            pass

    with repository.connect() as conn:
        sale = conn.execute('SELECT parcel_id FROM sale_requests WHERE id=%s', (sale_id,)).fetchone()
        if not sale:
            return
        conn.execute('INSERT INTO sale_parcel_state(parcel_id) VALUES (%s) ON CONFLICT DO NOTHING', (sale['parcel_id'],))
        conn.execute('SELECT parcel_id FROM sale_parcel_state WHERE parcel_id=%s FOR UPDATE', (sale['parcel_id'],))
        sale = conn.execute('SELECT * FROM sale_requests WHERE id=%s FOR UPDATE', (sale_id,)).fetchone()
        payload = conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s FOR UPDATE', (sale_id,)).fetchone()
        if payload['state'] not in ('PREPARED', 'SUBMITTED'):
            return
        if not logs:
            if block['timestamp'] > data['deadline']:
                conn.execute("UPDATE sale_chain_payloads SET state='EXPIRED' WHERE sale_id=%s", (sale_id,))
                conn.execute("UPDATE sale_requests SET status='EXPIRED',registrar_key_hash=NULL WHERE id=%s", (sale_id,))
                conn.execute('UPDATE sale_owner_approvals SET key_hash=NULL WHERE request_id=%s', (sale_id,))
                conn.execute("UPDATE sale_parcel_state SET cooldown_until=to_timestamp(%s)+interval '7 days' WHERE parcel_id=%s", (data['deadline'], sale['parcel_id']))
                record_event(conn, sale_id, 'SALE_EXPIRED')
            elif reverted:
                conn.execute("UPDATE sale_chain_payloads SET state='PREPARED',tx_hash=NULL WHERE sale_id=%s", (sale_id,))
                record_event(conn, sale_id, 'TRANSFER_FAILED', str(sale['registrar_user_id']), 'Blockchain receipt reverted; retry transfer completion')
            return
        conn.execute('SELECT ulpin FROM parcels WHERE ulpin=%s FOR UPDATE', (sale['parcel_id'],))
        conn.execute('SELECT id FROM ownerships WHERE parcel_id=%s AND active FOR UPDATE', (sale['parcel_id'],))
        if (not chain.history_matches(conn, sale['parcel_id'], ignore_deal=sale_id)
                or executed != data['newHash'] or ownership_state(conn, sale['parcel_id']) != payload['old_state']
                or state_hash(payload['new_state']) != executed):
            conn.execute("UPDATE sale_chain_payloads SET state='REVIEW' WHERE sale_id=%s", (sale_id,))
            return
        event = logs[-1]
        when = datetime.fromtimestamp(chain.contract.functions.executedAt(data['dealId']).call(), timezone.utc)
        names = conn.execute('SELECT u.display_name FROM sale_owner_approvals a JOIN users u ON u.id=a.registry_user_id WHERE a.request_id=%s ORDER BY u.id', (sale_id,)).fetchall()
        buyer = conn.execute("SELECT u.display_name FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE u.id=%s AND u.account_status='ACTIVE' AND a.role='CITIZEN' FOR UPDATE OF u,a", (sale['buyer_user_id'],)).fetchone()
        if not buyer:
            conn.execute("UPDATE sale_chain_payloads SET state='REVIEW' WHERE sale_id=%s", (sale_id,))
            return
        conn.execute('DELETE FROM parcel_sale_consents WHERE parcel_id=%s', (sale['parcel_id'],))
        conn.execute('UPDATE ownerships SET active=false WHERE parcel_id=%s AND active', (sale['parcel_id'],))
        conn.execute('INSERT INTO ownerships(parcel_id,user_id,share_bps,active) VALUES (%s,%s,10000,true)', (sale['parcel_id'], sale['buyer_user_id']))
        history = Jsonb([{'from': ', '.join(row['display_name'] or 'Owner' for row in names), 'to': buyer['display_name'],
                          'date': when.date().isoformat(), 'doc_hash': sale['document_hash'], 'sale_request_id': str(sale_id),
                          'blockchain_tx': Web3.to_hex(event['transactionHash'])}])
        conn.execute("""UPDATE parcels SET current_owner_user_id=%s,ownership_type='SOLE',last_registered_date=%s,
            transfer_history=transfer_history||%s,updated_at=now() WHERE ulpin=%s""", (sale['buyer_user_id'], when.date(), history, sale['parcel_id']))
        conn.execute("UPDATE sale_requests SET status='COMPLETED',completed_at=%s WHERE id=%s", (when, sale_id))
        conn.execute("UPDATE sale_chain_payloads SET state='CONFIRMED',tx_hash=%s,block_number=%s,confirmed_at=now() WHERE sale_id=%s", (Web3.to_hex(event['transactionHash']), event['blockNumber'], sale_id))
        record_event(conn, sale_id, 'TRANSFER_COMPLETED', str(sale['registrar_user_id']))


def reconcile_pending(repository, settings):
    if settings.chain_mode != 'live':
        return
    with repository.connect() as conn:
        ids = conn.execute("SELECT sale_id FROM sale_chain_payloads WHERE state IN ('PREPARED','SUBMITTED') ORDER BY created_at LIMIT 100").fetchall()
    for row in ids:
        try:
            reconcile_one(repository, settings, row['sale_id'])
        except Exception as failure:
            if isinstance(failure, OperationalError) or (isinstance(failure, HTTPException) and failure.status_code == 503):
                raise
            logging.getLogger(__name__).warning('Reconciliation failed for sale %s; continuing with other deals', row['sale_id'])
