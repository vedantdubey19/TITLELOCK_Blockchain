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


def test_event_cursor_resumes_bounded_scans_and_rechecks_reorgs():
    from app.chain.service import _event_history
    _event_history.cache_clear()
    chain=Registry.__new__(Registry)
    chain.address='0x'+'12'*20
    chain.settings=SimpleNamespace(chain_id=31337,chain_rpc_url='primary',chain_logs_rpc_url='events',
        chain_deployment_block=10,chain_log_block_range=5,chain_confirmations=3)
    fork={'version':0}
    block=lambda number:SimpleNamespace(hash=f"{fork['version']}:{number}".encode())
    chain.w3=SimpleNamespace(eth=SimpleNamespace(block_number=75,get_block=block))
    chain.logs_w3=SimpleNamespace(eth=SimpleNamespace(block_number=75,get_block=block))
    reads=[]
    def get_logs(**query):
        reads.append((query['from_block'],query['to_block']))
        return []
    chain.logs_contract=SimpleNamespace(events=SimpleNamespace(OwnershipTransferred=lambda:SimpleNamespace(get_logs=get_logs)))
    for _ in range(3):
        with pytest.raises(HTTPException) as failure:
            chain.transfer_logs({'parcelId':'parcel'})
        assert failure.value.status_code==503
    assert chain.transfer_logs({'parcelId':'parcel'})==[]
    assert reads==[(n,min(n+4,73)) for n in range(10,74,5)]
    previous=len(reads)
    assert chain.transfer_logs({'parcelId':'parcel'})==[]
    assert len(reads)==previous  # Confirmed ranges are not scanned again.
    fork['version']=1
    with pytest.raises(HTTPException):
        chain.transfer_logs({'parcelId':'parcel'})
    assert reads[previous:]==[(10,14),(15,19),(20,24),(25,29)]


def test_event_head_outage_is_503_without_leaking_provider_details():
    class Offline:
        @property
        def block_number(self):
            raise ConnectionError('private-provider-credential')
    chain=Registry.__new__(Registry)
    chain.w3=SimpleNamespace(eth=Offline())
    with pytest.raises(HTTPException) as failure:
        chain.transfer_logs({})
    assert failure.value.status_code==503
    assert 'private-provider-credential' not in str(failure.value.detail)
