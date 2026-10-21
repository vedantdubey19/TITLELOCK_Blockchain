import pytest
from pydantic import ValidationError

from app.config import Settings
from app.chain.service import Registry


def test_only_supported_test_networks():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, chain_id=1)


@pytest.mark.parametrize('options', [
    {'chain_confirmations': 1, 'chain_rpc_url': 'https://example.com'},
    {'chain_confirmations': 3, 'chain_rpc_url': 'http://example.com'},
])
def test_sepolia_requires_confirmations_and_https(options):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, chain_id=11155111, **options)


def test_sepolia_domain_and_transaction_network():
    from types import SimpleNamespace
    from datetime import datetime, timezone
    chain = Registry.__new__(Registry)
    chain.settings = SimpleNamespace(chain_id=11155111)
    chain.address = '0x' + '12' * 20
    chain.contract = SimpleNamespace(encode_abi=lambda *args, **kwargs: '0x1234')
    wallet = '0x' + '34' * 20
    sale = {'id': 'sale', 'parcel_id': 'parcel', 'document_hash': 'doc', 'expires_at': datetime.now(timezone.utc)}
    typed = chain.typed_transfer(sale, {}, {}, wallet, wallet)
    assert typed['domain']['chainId'] == 11155111
    assert chain.transaction(typed, {wallet: 'signature'}, [wallet])['chainId'] == '0xaa36a7'


def test_chain_id_from_environment(monkeypatch):
    monkeypatch.setenv('CHAIN_ID', '11155111')
    monkeypatch.setenv('CHAIN_CONFIRMATIONS', '3')
    monkeypatch.setenv('CHAIN_RPC_URL', 'https://example.com')
    assert Settings(_env_file=None).chain_id == 11155111


def test_deployed_sepolia_requires_a_verified_start_block():
    values=dict(_env_file=None,chain_id=11155111,chain_confirmations=3,
                chain_rpc_url='https://example.com',chain_contract_address='0x'+'12'*20)
    with pytest.raises(ValidationError):
        Settings(**values)
    assert Settings(**values,chain_deployment_block=100).chain_deployment_block==100
