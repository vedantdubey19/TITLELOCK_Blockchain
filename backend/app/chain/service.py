"""Local EVM adapter and deterministic ownership commitments."""
import json
from functools import lru_cache
from threading import Lock
from decimal import Decimal
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3


TRANSFER_FIELDS = [
    {'name': name, 'type': kind} for name, kind in [
        ('dealId','bytes32'),('parcelId','bytes32'),('previousHash','bytes32'),('newHash','bytes32'),
        ('documentHash','bytes32'),('buyer','address'),('registrar','address'),('deadline','uint256')]
]
DOMAIN_FIELDS = [{'name':name,'type':kind} for name,kind in
                 [('name','string'),('version','string'),('chainId','uint256'),('verifyingContract','address')]]


@lru_cache(maxsize=64)
def _event_history(key):
    # Process-local cache cannot be edited through a compromised database.
    return {'lock':Lock(),'cursor':None,'hash':None,'logs':[]}


def hexhash(text):
    return Web3.to_hex(Web3.keccak(text=text))


def state_hash(state):
    return hexhash(json.dumps(state,sort_keys=True,separators=(',',':')))


def ownership_state(conn, parcel_id):
    parcel = conn.execute('SELECT ulpin,survey_number,area_sqm,ownership_type,current_owner_user_id FROM parcels WHERE ulpin=%s', (parcel_id,)).fetchone()
    if not parcel:
        raise HTTPException(404,'Property unavailable')
    owners = conn.execute('SELECT user_id,share_bps FROM ownerships WHERE parcel_id=%s AND active ORDER BY user_id', (parcel_id,)).fetchall()
    return {'schema':1, 'ulpin':parcel['ulpin'], 'survey_number':parcel['survey_number'],
            'area_sqm':format(Decimal(parcel['area_sqm']).normalize(),'f') if parcel['area_sqm'] is not None else None,
            'ownership_type':parcel['ownership_type'], 'current_owner':str(parcel['current_owner_user_id']),
            'owners':[[str(owner['user_id']),owner['share_bps']] for owner in owners]}


def linked_wallet(conn, registry_id, settings=None):
    wallet = conn.execute('''SELECT w.user_id,w.address,w.binding_message,w.binding_signature FROM chain_wallets w WHERE w.user_id=%s OR w.user_id IN
        (SELECT account_user_id FROM account_identity_links WHERE registry_user_id=%s)''', (registry_id,registry_id)).fetchall()
    if len(wallet) != 1:
        raise HTTPException(409,'Every participant must link a unique wallet first')
    row=wallet[0]
    try:
        message=row['binding_message']
        recovered=Account.recover_message(encode_typed_data(full_message=message),signature=row['binding_signature'])
        valid=(message['primaryType']=='WalletBinding' and message['domain']['name']=='TitleLock'
               and message['domain']['chainId'] in (31337,11155111)
               and (settings is None or (message['domain']['chainId']==settings.chain_id
                    and message['domain']['verifyingContract'].lower()==settings.chain_contract_address.lower())) and message['message']['account']==hexhash(str(row['user_id']))
               and recovered.lower()==row['address'].lower())
    except Exception:
        valid=False
    if not valid:
        raise HTTPException(409,'Stored wallet binding proof is invalid; transfers blocked')
    return Web3.to_checksum_address(row['address'])


class Registry:
    def __init__(self, settings):
        # This implementation deliberately cannot send real-money mainnet transactions.
        if settings.chain_id not in (31337,11155111) or not settings.chain_contract_address:
            raise HTTPException(503,'Test blockchain contract is not configured')
        self.settings = settings
        self.w3 = Web3(Web3.HTTPProvider(settings.chain_rpc_url,request_kwargs={'timeout':5}))
        try:
            if self.w3.eth.chain_id != settings.chain_id:
                raise HTTPException(503,'RPC network differs from configured test chain')
            self.address = Web3.to_checksum_address(settings.chain_contract_address)
            if not self.w3.eth.get_code(self.address):
                raise HTTPException(503,'Registry contract is missing; chain may have been reset')
            abi=json.loads(Path(__file__).with_name('registry_abi.json').read_text())
            self.contract = self.w3.eth.contract(address=self.address,abi=abi)
            self.logs_w3=self.w3
            if settings.chain_logs_rpc_url:
                self.logs_w3=Web3(Web3.HTTPProvider(settings.chain_logs_rpc_url,request_kwargs={'timeout':10}))
                if self.logs_w3.eth.chain_id!=settings.chain_id:
                    raise HTTPException(503,'Event RPC network differs from configured test chain')
            self.logs_contract=self.logs_w3.eth.contract(address=self.address,abi=abi)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503,'Test blockchain is unavailable') from None

    def state(self, parcel_id):
        try:
            digest, owners = self.contract.functions.stateOf(hexhash(parcel_id)).call()
            return Web3.to_hex(digest), owners
        except Exception:
            raise HTTPException(503,'Unable to read the blockchain') from None

    def submit_receipt(self, deal_id, parcel_id, previous_hash, new_hash, document_hash):
        """Submit a hash-only receipt from the protected TitleLock service wallet."""
        key=self.settings.chain_service_private_key.get_secret_value()
        if not key:
            raise HTTPException(503,'Blockchain service wallet is not configured')
        try:
            operator=Account.from_key(key)
            if not self.contract.functions.hasRole(self.contract.functions.REGISTRAR_ROLE().call(),operator.address).call():
                raise HTTPException(503,'Blockchain service wallet is not authorized')
            tx=self.contract.functions.recordTransfer(deal_id,parcel_id,previous_hash,new_hash,document_hash).build_transaction({
                'from':operator.address,'nonce':self.w3.eth.get_transaction_count(operator.address),'chainId':self.settings.chain_id,
            })
            signed=operator.sign_transaction(tx)
            return Web3.to_hex(self.w3.eth.send_raw_transaction(signed.raw_transaction))
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503,'Blockchain receipt submission failed') from None

    def check(self, conn, parcel_id):
        digest, wallets = self.state(parcel_id)
        if digest == '0x'+'00'*32:
            raise HTTPException(409,'Property needs a verified initial blockchain anchor')
        state = ownership_state(conn,parcel_id)
        if state_hash(state) != digest:
            raise HTTPException(409,'Database and blockchain ownership mismatch; transfers blocked')
        if not self.history_matches(conn,parcel_id):
            raise HTTPException(409,'Database transfer history differs from the blockchain; transfers blocked')
        expected = [linked_wallet(conn,owner[0],self.settings).lower() for owner in state['owners']]
        if expected != [address.lower() for address in wallets]:
            raise HTTPException(409,'Ownership wallet mapping differs from the blockchain')
        return state

    def history_matches(self, conn, parcel_id, ignore_deal=None):
        logs=self.transfer_logs({'parcelId':hexhash(parcel_id)})
        rows=conn.execute('SELECT s.id,s.document_hash,s.buyer_user_id,s.completed_at,c.old_state,c.new_state,c.tx_hash FROM sale_requests s JOIN sale_chain_payloads c ON c.sale_id=s.id WHERE s.parcel_id=%s', (parcel_id,)).fetchall()
        known={hexhash(str(row['id'])):row for row in rows}
        parcel=conn.execute('SELECT transfer_history,last_registered_date FROM parcels WHERE ulpin=%s',(parcel_id,)).fetchone()
        recorded={entry.get('sale_request_id'):entry for entry in parcel['transfer_history'] if isinstance(entry,dict)}
        for event in logs:
            args=event['args']
            if ignore_deal and Web3.to_hex(args['dealId'])==hexhash(str(ignore_deal)):
                continue
            row=known.get(Web3.to_hex(args['dealId']))
            if not row or hexhash(row['document_hash'])!=Web3.to_hex(args['documentHash']):
                return False
            if state_hash(row['old_state'])!=Web3.to_hex(args['previousHash']) or state_hash(row['new_state'])!=Web3.to_hex(args['newHash']):
                return False
            entry=recorded.get(str(row['id']))
            timestamp=self.contract.functions.executedAt(args['dealId']).call()
            when=datetime.fromtimestamp(timestamp,timezone.utc)
            if not row['completed_at'] or int(row['completed_at'].timestamp())!=timestamp or str(row['buyer_user_id'])!=row['new_state']['current_owner']:
                return False
            if not entry or entry.get('date')!=when.date().isoformat() or entry.get('doc_hash')!=row['document_hash'] or entry.get('blockchain_tx')!=Web3.to_hex(event['transactionHash']):
                return False
        if logs and not ignore_deal:
            latest=self.contract.functions.executedAt(logs[-1]['args']['dealId']).call()
            if parcel['last_registered_date']!=datetime.fromtimestamp(latest,timezone.utc).date():
                return False
        return True

    def transfer_logs(self, filters):
        try:
            head=self.w3.eth.block_number
            if self.logs_w3.eth.block_number<head:
                raise HTTPException(503,'Event RPC is behind the primary RPC; retry verification')
            if self.w3.eth.get_block(head).hash!=self.logs_w3.eth.get_block(head).hash:
                raise HTTPException(503,'RPC providers disagree on the chain; retry verification')
            first=self.settings.chain_deployment_block
            if first>head:
                raise HTTPException(503,'Configured deployment block is ahead of the chain')
            confirmed=head-self.settings.chain_confirmations+1
            key=(self.settings.chain_id,self.address,self.settings.chain_rpc_url,
                 self.settings.chain_logs_rpc_url,first,tuple(sorted(filters.items())))
            cache=_event_history(key)
            with cache['lock']:
                if cache['cursor'] is not None and (cache['cursor']>confirmed or
                        self.w3.eth.get_block(cache['cursor']).hash!=cache['hash']):
                    cache.update(cursor=None,hash=None,logs=[])
                start=first if cache['cursor'] is None else cache['cursor']+1
                # Limit cold-history work per request; retries resume the verified cursor.
                end=min(confirmed,start+self.settings.chain_log_block_range*4-1)
                if start<=end:
                    checkpoint=self.w3.eth.get_block(end).hash
                    additions=[]
                    for block in range(start,end+1,self.settings.chain_log_block_range):
                        additions.extend(self.logs_contract.events.OwnershipTransferred().get_logs(
                            from_block=block,to_block=min(end,block+self.settings.chain_log_block_range-1),argument_filters=filters))
                    if self.w3.eth.get_block(end).hash!=checkpoint or self.logs_w3.eth.get_block(end).hash!=checkpoint:
                        raise HTTPException(503,'Chain changed during history verification; retry')
                    if len(cache['logs'])+len(additions)>10000:
                        raise HTTPException(503,'Property history exceeds interactive verification limits')
                    cache.update(cursor=end,hash=checkpoint,logs=cache['logs']+additions)
                if end<confirmed:
                    raise HTTPException(503,'Historical events are syncing; retry verification')
                return sorted(cache['logs'],key=lambda event:(event['blockNumber'],event['logIndex']))
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503,'Historical blockchain events are unavailable') from None

    def receipt_matches_transfer(self, receipt, typed):
        # Protected wallets may wrap calldata. Trust only the exact event emitted
        # by our registry, never a matching event from another contract.
        from web3.logs import DISCARD
        if receipt['status'] != 1:
            return False
        expected = typed['message']
        events = self.contract.events.OwnershipTransferred().process_receipt(receipt, errors=DISCARD)
        for event in events:
            if event['address'].lower() != self.address.lower():
                continue
            values = event['args']
            if all(Web3.to_hex(values[field]).lower() == expected[field].lower()
                   for field in ('dealId','parcelId','previousHash','newHash','documentHash')) and all(
                   values[field].lower() == expected[field].lower() for field in ('buyer','registrar')):
                return True
        return False

    def typed_transfer(self, sale, old, new, buyer, registrar):
        return {'types':{'EIP712Domain':DOMAIN_FIELDS,'Transfer':TRANSFER_FIELDS},
                'primaryType':'Transfer', 'domain':{'name':'TitleLock','version':'1','chainId':self.settings.chain_id,'verifyingContract':self.address},
                'message':{'dealId':hexhash(str(sale['id'])),'parcelId':hexhash(sale['parcel_id']),
                    'previousHash':state_hash(old),'newHash':state_hash(new),
                    'documentHash':hexhash(sale['document_hash']),'buyer':buyer,'registrar':registrar,
                    'deadline':int(sale['expires_at'].timestamp())}}

    def transaction(self, typed, signatures, owner_wallets):
        data = typed['message']
        args = tuple(data[field['name']] for field in TRANSFER_FIELDS)
        owner_sigs = [signatures[address.lower()] for address in owner_wallets]
        registrar_sig = signatures[data['registrar'].lower()]
        return {'to':self.address,'from':data['registrar'],'chainId':hex(self.settings.chain_id),'value':'0x0',
                'data':self.contract.encode_abi('executeTransfer',args=[args,owner_sigs,registrar_sig])}
