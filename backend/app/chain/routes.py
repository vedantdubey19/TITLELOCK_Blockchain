import secrets
from datetime import datetime, timezone
from uuid import UUID

from eth_account import Account
from eth_account.messages import encode_typed_data
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from psycopg.types.json import Jsonb
from web3 import Web3

from ..auth.routes import check_origin, current_user, get_repository
from ..audit.sales import can_view, record_event
from .service import Registry, DOMAIN_FIELDS, hexhash, linked_wallet, ownership_state, state_hash

router = APIRouter(prefix='/api/chain',tags=['blockchain'],dependencies=[Depends(check_origin)])


class WalletAddress(BaseModel):
    address: str = Field(pattern=r'^0x[0-9a-fA-F]{40}$')


class SignatureProof(BaseModel):
    signature: str = Field(pattern=r'^0x[0-9a-fA-F]{130}$')


def registry(request):
    if request.app.state.settings.chain_mode != 'live':
        raise HTTPException(409,'Blockchain mode is not enabled')
    return Registry(request.app.state.settings)


def recover(typed, signature):
    try:
        return Account.recover_message(encode_typed_data(full_message=typed),signature=signature).lower()
    except Exception:
        raise HTTPException(401,'Invalid wallet signature') from None


@router.get('/wallet')
def wallet(response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        row=conn.execute('SELECT address FROM chain_wallets WHERE user_id=%s',(user.id,)).fetchone()
    return {'address':row['address'] if row else None}


@router.post('/wallet/challenge')
def wallet_challenge(data: WalletAddress,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    chain=registry(request)
    typed={'domain':{'name':'TitleLock','version':'1','chainId':chain.settings.chain_id,'verifyingContract':chain.address},
        'primaryType':'WalletBinding','types':{'EIP712Domain':DOMAIN_FIELDS,'WalletBinding':[
            {'name':'account','type':'bytes32'},{'name':'nonce','type':'bytes32'},{'name':'deadline','type':'uint256'}]},
        'message':{'account':hexhash(user.id),'nonce':'0x'+secrets.token_hex(32),'deadline':int(datetime.now(timezone.utc).timestamp())+300}}
    with repository.connect() as conn:
        conn.execute('''INSERT INTO chain_wallet_challenges(user_id,address,message,expires_at) VALUES (%s,%s,%s,to_timestamp(%s))
            ON CONFLICT(user_id) DO UPDATE SET address=EXCLUDED.address,message=EXCLUDED.message,expires_at=EXCLUDED.expires_at,consumed=false''',
            (user.id,data.address.lower(),Jsonb(typed),typed['message']['deadline']))
    return typed


@router.post('/wallet/verify')
def verify_wallet(data: SignatureProof,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        conn.execute('SELECT user_id FROM auth_accounts WHERE user_id=%s FOR UPDATE',(user.id,))
        challenge=conn.execute('SELECT *,expires_at>clock_timestamp() AS valid FROM chain_wallet_challenges WHERE user_id=%s FOR UPDATE',(user.id,)).fetchone()
        if not challenge or challenge['consumed'] or not challenge['valid'] or recover(challenge['message'],data.signature)!=challenge['address']:
            raise HTTPException(401,'Invalid or expired wallet-link challenge')
        bound=conn.execute('SELECT address FROM chain_wallets WHERE user_id=%s OR address=%s',(user.id,challenge['address'])).fetchall()
        if bound:
            raise HTTPException(409,'Account or wallet is already linked; wallet replacement is not enabled')
        conn.execute('INSERT INTO chain_wallets(user_id,address,binding_message,binding_signature) VALUES (%s,%s,%s,%s)',(user.id,challenge['address'],Jsonb(challenge['message']),data.signature))
        conn.execute('UPDATE chain_wallet_challenges SET consumed=true WHERE user_id=%s',(user.id,))
    return {'address':challenge['address']}


@router.get('/properties/{ulpin}/verify')
def verify_property(ulpin: str,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    chain=registry(request)
    with repository.connect() as conn:
        if not conn.execute('SELECT 1 FROM parcels WHERE ulpin=%s',(ulpin,)).fetchone():
            raise HTTPException(404,'Property unavailable')
        digest,chain_owners=chain.state(ulpin)
        state=ownership_state(conn,ulpin)
        job=conn.execute("SELECT state,old_state,new_state FROM sale_chain_payloads p JOIN sale_requests s ON s.id=p.sale_id WHERE s.parcel_id=%s AND p.state IN ('PREPARED','SUBMITTED','REVIEW') LIMIT 1",(ulpin,)).fetchone()
        status='UNVERIFIED'
        if digest!='0x'+'00'*32:
            if digest==state_hash(state):
                try:
                    chain.check(conn,ulpin)
                    status='MATCH'
                except HTTPException as failure:
                    if failure.status_code!=409:
                        raise
                    status='MISMATCH'
            elif job and job['state']!='REVIEW' and state==job['old_state'] and digest==state_hash(job['new_state']):
                status='AWAITING_CONFIRMATION'
            else:
                status='MISMATCH'
    return {'status':status,'database_hash':state_hash(state),'blockchain_hash':digest,'chain_id':chain.settings.chain_id,'contract':chain.address}


@router.get('/sales/{sale_id}/signing-data')
def signing_data(sale_id: UUID,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    from ..transfers.sales import lock_sale
    response.headers['Cache-Control']='no-store'
    chain=registry(request)
    with repository.connect() as conn:
        if not can_view(conn,sale_id,user.id):
            raise HTTPException(404,'Sale request unavailable')
        sale=lock_sale(conn,sale_id)
        if not sale['expires_at']:
            raise HTTPException(409,'Owner must generate a key first')
        old=chain.check(conn,sale['parcel_id'])
        buyer=linked_wallet(conn,str(sale['buyer_user_id']),chain.settings)
        registrar=linked_wallet(conn,str(sale['registrar_user_id']),chain.settings)
        if not chain.contract.functions.hasRole(chain.contract.functions.REGISTRAR_ROLE().call(),registrar).call():
            raise HTTPException(409,'Registrar wallet needs operator authorization on the contract')
        new=old | {'current_owner':str(sale['buyer_user_id']),'ownership_type':'SOLE','owners':[[str(sale['buyer_user_id']),10000]]}
        typed=chain.typed_transfer(sale,old,new,buyer,registrar)
        existing=conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s',(sale_id,)).fetchone()
        if existing:
            if existing['typed_data']!=typed:
                raise HTTPException(409,'Signed ownership details changed; manual review required')
            return existing['typed_data']
        conn.execute('INSERT INTO sale_chain_payloads(sale_id,typed_data,old_state,new_state) VALUES (%s,%s,%s,%s)',
                     (sale_id,Jsonb(typed),Jsonb(old),Jsonb(new)))
    return typed


@router.post('/sales/{sale_id}/signature')
def save_signature(sale_id: UUID,data: SignatureProof,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    from ..transfers.sales import lock_sale,owner_identity
    response.headers['Cache-Control']='no-store'
    chain=registry(request)
    with repository.connect() as conn:
        if not can_view(conn,sale_id,user.id):
            raise HTTPException(404,'Sale request unavailable')
        sale=lock_sale(conn,sale_id)
        payload=conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s FOR UPDATE',(sale_id,)).fetchone()
        if not payload or payload['state']!='SIGNING':
            raise HTTPException(409,'Prepare wallet signing data first')
        wallet=linked_wallet(conn,user.id,chain.settings).lower()
        if recover(payload['typed_data'],data.signature)!=wallet:
            raise HTTPException(401,'Signature does not match your linked wallet')
        if user.role=='REGISTRAR' and str(sale['registrar_user_id'])==user.id:
            if not sale['registrar_approved']:
                raise HTTPException(409,'Registrar key approval required first')
        else:
            owners=owner_identity(conn,sale_id,user.id)
            if any(not owner['approved'] for owner in owners):
                raise HTTPException(409,'Owner key approval required first')
        if wallet not in payload['signatures']:
            record_event(conn,sale_id,'WALLET_APPROVED',user.id)
        signatures=payload['signatures'] | {wallet:data.signature}
        conn.execute('UPDATE sale_chain_payloads SET signatures=%s WHERE sale_id=%s',(Jsonb(signatures),sale_id))
    return {'status':'SIGNED'}


@router.post('/sales/{sale_id}/refresh')
def refresh_chain(sale_id: UUID,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    from .settlement import reconcile_one
    response.headers['Cache-Control']='no-store'
    registry(request)
    with repository.connect() as conn:
        if not can_view(conn,sale_id,user.id):
            raise HTTPException(404,'Sale request unavailable')
    reconcile_one(repository,request.app.state.settings,sale_id)
    with repository.connect() as conn:
        row=conn.execute('SELECT state,tx_hash,block_number,confirmed_at FROM sale_chain_payloads WHERE sale_id=%s',(sale_id,)).fetchone()
    return row or {'state':'NOT_SUBMITTED'}


class SubmittedTransaction(BaseModel):
    tx_hash: str = Field(pattern=r'^0x[0-9a-fA-F]{64}$')


@router.get('/sales/{sale_id}/transaction')
def retry_transaction(sale_id: UUID,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    from ..transfers.sales import lock_sale
    from .settlement import prepare_transaction
    response.headers['Cache-Control']='no-store'
    registry(request)
    with repository.connect() as conn:
        sale=lock_sale(conn,sale_id)
        if user.role!='REGISTRAR' or str(sale['registrar_user_id'])!=user.id:
            raise HTTPException(403,'Assigned registrar required')
        return prepare_transaction(conn,sale,request.app.state.settings)


@router.post('/sales/{sale_id}/submitted')
def submitted_transaction(sale_id: UUID,data: SubmittedTransaction,request: Request,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    chain=registry(request)
    try:
        tx=chain.w3.eth.get_transaction(data.tx_hash)
    except Exception:
        raise HTTPException(409,'Transaction not visible on the configured chain yet; refresh confirmation') from None
    with repository.connect() as conn:
        sale=conn.execute('SELECT * FROM sale_requests WHERE id=%s FOR UPDATE',(sale_id,)).fetchone()
        if not sale or user.role!='REGISTRAR' or str(sale['registrar_user_id'])!=user.id:
            raise HTTPException(404,'Sale request unavailable')
        payload=conn.execute('SELECT * FROM sale_chain_payloads WHERE sale_id=%s FOR UPDATE',(sale_id,)).fetchone()
        if not payload or payload['state'] not in ('PREPARED','SUBMITTED'):
            raise HTTPException(409,'Sale is not awaiting a blockchain transaction')
        wallets=[linked_wallet(conn,owner[0],chain.settings) for owner in payload['old_state']['owners']]
        expected=chain.transaction(payload['typed_data'],payload['signatures'],wallets)
        if tx['from'].lower()!=expected['from'].lower():
            raise HTTPException(409,'Transaction sender does not match this sale')
        direct=tx['to']==chain.address and Web3.to_hex(tx['input']).lower()==expected['data'].lower()
        if not direct:
            from web3.exceptions import TransactionNotFound
            try:
                receipt=chain.w3.eth.get_transaction_receipt(data.tx_hash)
            except TransactionNotFound:
                response.status_code=202
                return {'state':'AWAITING_CONTRACT_EVENT','message':'Wallet-routed transaction is pending. Refresh confirmation after mining.'}
            if not chain.receipt_matches_transfer(receipt,payload['typed_data']):
                raise HTTPException(409,'Transaction does not contain the exact registry transfer event')
        conn.execute("UPDATE sale_chain_payloads SET state='SUBMITTED',tx_hash=%s WHERE sale_id=%s",(data.tx_hash,sale_id))
    return {'state':'SUBMITTED','tx_hash':data.tx_hash}
