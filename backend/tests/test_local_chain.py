"""Opt-in integration against real Anvil; disposable wallets and isolated database."""
import json
import os
from pathlib import Path

import pytest
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

from app.chain.service import ownership_state,state_hash,hexhash
from tests.test_sales import sales,exchange_approvals
from tests.test_auth_postgres import postgres_auth


def test_real_chain_two_party_settlement_and_tamper_detection(sales,postgres_auth):
    rpc=os.environ.get('CHAIN_TEST_RPC')
    if not rpc: pytest.skip('CHAIN_TEST_RPC is not configured')
    repo,accounts,call,create=sales
    client,_=postgres_auth
    w3=Web3(Web3.HTTPProvider(rpc));assert w3.eth.chain_id==31337
    artifact=json.loads((Path(__file__).parents[2]/'blockchain/out/TitleLockRegistry.sol/TitleLockRegistry.json').read_text())
    receipt=w3.eth.wait_for_transaction_receipt(w3.eth.contract(abi=artifact['abi'],bytecode=artifact['bytecode']['object']).constructor().transact({'from':w3.eth.accounts[0]}))
    contract=w3.eth.contract(address=receipt.contractAddress,abi=artifact['abi'])
    settings=client.app.state.settings
    settings.chain_mode='live';settings.chain_contract_address=contract.address;settings.chain_rpc_url=rpc
    with repo.connect() as conn:
        conn.execute("ALTER TABLE parcels ADD COLUMN survey_number text DEFAULT 'SN-1', ADD COLUMN area_sqm numeric DEFAULT 1200")
    wallets={name:Account.create() for name in ('owner','coowner','buyer','registrar')}
    def api(name,method,path,data=None):
        return client.request(method,path,json=data,headers={'Authorization':'Bearer '+accounts[name]['access_token']})
    for name,wallet in wallets.items():
        typed=api(name,'POST','/api/chain/wallet/challenge',{'address':wallet.address}).json()
        sig=Web3.to_hex(Account.sign_message(encode_typed_data(full_message=typed),wallet.key).signature)
        assert api(name,'POST','/api/chain/wallet/verify',{'signature':sig}).status_code==200
        assert api(name,'POST','/api/chain/wallet/verify',{'signature':sig}).status_code==401
    assert create().status_code==409
    w3.eth.wait_for_transaction_receipt(contract.functions.grantRole(contract.functions.REGISTRAR_ROLE().call(),wallets['registrar'].address).transact({'from':w3.eth.accounts[0]}))
    with repo.connect() as conn: old=ownership_state(conn,'LAND-1')
    names_by_id={accounts[name]['user']['id']:name for name in wallets}
    addresses=[wallets[names_by_id[owner[0]]].address for owner in old['owners']]
    w3.eth.wait_for_transaction_receipt(contract.functions.anchor(hexhash('LAND-1'),state_hash(old),addresses).transact({'from':w3.eth.accounts[0]}))
    sale=create(legacy=False).json()['id']
    assert api('owner','POST',f'/api/chain/sales/{sale}/signature',{'signature':'0x'+'00'*65}).status_code!=200
    exchange_approvals(call,sale)
    assert call('registrar','POST',f'/{sale}/complete',{}).status_code==409
    for name in ('owner','coowner','registrar'):
        typed=api(name,'GET',f'/api/chain/sales/{sale}/signing-data').json()
        sig=Web3.to_hex(Account.sign_message(encode_typed_data(full_message=typed),wallets[name].key).signature)
        result=api(name,'POST',f'/api/chain/sales/{sale}/signature',{'signature':sig})
        assert result.status_code==200,result.text
    prepared=call('registrar','POST',f'/{sale}/complete',{})
    assert prepared.status_code==200,prepared.text
    assert prepared.json()['status']=='AWAITING_BLOCKCHAIN'
    with repo.connect() as conn: assert ownership_state(conn,'LAND-1')==old
    w3.eth.wait_for_transaction_receipt(w3.eth.send_transaction({'from':w3.eth.accounts[0],'to':wallets['registrar'].address,'value':Web3.to_wei(1,'ether')}))
    tx=prepared.json()['transaction']
    tx={'to':tx['to'],'data':tx['data'],'value':0,'chainId':31337,'nonce':w3.eth.get_transaction_count(wallets['registrar'].address),'gas':1000000,'gasPrice':w3.eth.gas_price}
    signed=Account.sign_transaction(tx,wallets['registrar'].key)
    receipt=w3.eth.wait_for_transaction_receipt(w3.eth.send_raw_transaction(signed.raw_transaction));assert receipt.status==1
    result=api('buyer','POST',f'/api/chain/sales/{sale}/refresh',{})
    assert result.status_code==200,result.text
    assert result.json()['state']=='CONFIRMED'
    assert api('buyer','POST',f'/api/chain/sales/{sale}/refresh',{}).json()['state']=='CONFIRMED'
    assert api('buyer','GET','/api/chain/properties/LAND-1/verify').json()['status']=='MATCH'
    with repo.connect() as conn:
        assert conn.execute("SELECT count(*) AS n FROM ownerships WHERE parcel_id='LAND-1' AND active").fetchone()['n']==1
        conn.execute("UPDATE parcels SET area_sqm=9999 WHERE ulpin='LAND-1'")
    assert api('buyer','GET','/api/chain/properties/LAND-1/verify').json()['status']=='MISMATCH'
    assert create().status_code==409
    with repo.connect() as conn:
        conn.execute("UPDATE parcels SET area_sqm=1200 WHERE ulpin='LAND-1'")
        conn.execute('UPDATE sale_requests SET document_hash=%s WHERE id=%s',('edited-document-hash',sale))
    assert api('buyer','GET','/api/chain/properties/LAND-1/verify').json()['status']=='MISMATCH'
    with repo.connect() as conn:
        conn.execute('UPDATE sale_requests SET document_hash=%s WHERE id=%s',('test-document-hash',sale))
    assert api('buyer','GET','/api/chain/properties/LAND-1/verify').json()['status']=='MATCH'
