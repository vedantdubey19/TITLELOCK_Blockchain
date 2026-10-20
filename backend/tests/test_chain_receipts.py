"""Real ABI event decoding for wallet-routed transfer receipts."""
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from eth_abi import encode
from web3 import Web3
from fastapi import HTTPException
from app.chain.service import Registry, hexhash


def receipt_fixture():
    chain=Registry.__new__(Registry)
    chain.address='0x'+'12'*20
    abi=json.loads((Path(__file__).parents[1]/'app/chain/registry_abi.json').read_text())
    chain.contract=Web3().eth.contract(address=chain.address,abi=abi)
    fields={'dealId':hexhash('deal'),'parcelId':hexhash('parcel'),'previousHash':hexhash('old'),
            'newHash':hexhash('new'),'documentHash':hexhash('document'),'buyer':'0x'+'34'*20,'registrar':'0x'+'56'*20}
    log={'address':chain.address,'topics':[Web3.keccak(text='OwnershipTransferred(bytes32,bytes32,bytes32,bytes32,bytes32,address,address)'),
         Web3.to_bytes(hexstr=fields['dealId']),Web3.to_bytes(hexstr=fields['parcelId'])],
         'data':Web3.to_hex(encode(['bytes32','bytes32','bytes32','address','address'],
             [Web3.to_bytes(hexstr=fields[f]) for f in ('previousHash','newHash','documentHash')]+[fields['buyer'],fields['registrar']])),
         'blockNumber':10,'blockHash':bytes(32),'transactionHash':bytes(32),'transactionIndex':0,'logIndex':0,'removed':False}
    return chain,{'status':1,'logs':[log]}, {'message':fields}


def test_routed_receipt_requires_exact_registry_event():
    chain,receipt,typed=receipt_fixture()
    assert chain.receipt_matches_transfer(receipt,typed)
    assert not chain.receipt_matches_transfer(receipt,{'message':typed['message']|{'documentHash':hexhash('different')}})
    assert not chain.receipt_matches_transfer(receipt,{'message':typed['message']|{'buyer':'0x'+'78'*20}})
    assert not chain.receipt_matches_transfer(receipt|{'status':0},typed)
    receipt['logs'][0]['address']='0x'+'90'*20
    assert not chain.receipt_matches_transfer(receipt,typed)


def test_event_provider_disagreement_fails_closed():
    chain=Registry.__new__(Registry)
    chain.settings=SimpleNamespace(chain_deployment_block=10,chain_log_block_range=10)
    chain.w3=SimpleNamespace(eth=SimpleNamespace(block_number=10,get_block=lambda n:SimpleNamespace(hash=b'primary')))
    chain.logs_w3=SimpleNamespace(eth=SimpleNamespace(block_number=10,get_block=lambda n:SimpleNamespace(hash=b'other')))
    chain.logs_contract=SimpleNamespace(events=SimpleNamespace(OwnershipTransferred=lambda:SimpleNamespace(get_logs=lambda **kwargs:[])))
    with pytest.raises(HTTPException) as failure:
        chain.transfer_logs({})
    assert failure.value.status_code==503
