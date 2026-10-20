from threading import Event

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_chain_outage_does_not_skip_sale_expiry(monkeypatch):
    swept = Event()

    def unavailable(*args):
        raise RuntimeError('Chain RPC unavailable')

    monkeypatch.setattr('app.main.reconcile_pending', unavailable)
    monkeypatch.setattr('app.main.expire_sales', lambda repository: swept.set())
    settings = Settings(_env_file=None, app_env='testing', database_url='postgresql://unused/test')
    with TestClient(create_app(settings)):
        assert swept.wait(2), 'Expiry must still run when chain reconciliation fails'


def test_malformed_sale_does_not_block_later_reconciliation(monkeypatch):
    from unittest.mock import MagicMock
    from app.chain.settlement import reconcile_pending
    repository=MagicMock()
    repository.connect.return_value.__enter__.return_value.execute.return_value.fetchall.return_value=[{'sale_id':'bad'},{'sale_id':'valid'}]
    attempts=[]

    def reconcile(repository,settings,sale_id):
        attempts.append(sale_id)
        if sale_id=='bad':
            raise KeyError('Malformed stored payload')

    monkeypatch.setattr('app.chain.settlement.reconcile_one',reconcile)
    reconcile_pending(repository,Settings(_env_file=None,chain_mode='live'))
    assert attempts==['bad','valid']


def test_global_chain_outage_does_not_retry_every_sale(monkeypatch):
    import pytest
    from unittest.mock import MagicMock
    from fastapi import HTTPException
    from app.chain.settlement import reconcile_pending
    repository=MagicMock()
    repository.connect.return_value.__enter__.return_value.execute.return_value.fetchall.return_value=[{'sale_id':'first'},{'sale_id':'second'}]
    attempts=[]

    def unavailable(repository,settings,sale_id):
        attempts.append(sale_id)
        raise HTTPException(503,'Chain is unavailable')

    monkeypatch.setattr('app.chain.settlement.reconcile_one',unavailable)
    with pytest.raises(HTTPException):
        reconcile_pending(repository,Settings(_env_file=None,chain_mode='live'))
    assert attempts==['first']
