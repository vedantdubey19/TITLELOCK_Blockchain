"""A failed synthetic setup resumes without rotating identity secrets or resetting ownership."""
import pytest
from dotenv import set_key, dotenv_values
from psycopg.conninfo import conninfo_to_dict
from app.cli import sepolia_demo
from tests.test_auth_postgres import postgres_auth


def test_partial_setup_resumes_and_preserves_later_transfer(postgres_auth,tmp_path,monkeypatch):
    _,repo=postgres_auth
    schema=conninfo_to_dict(repo.database_url)['options'].split('search_path=',1)[1]
    env=tmp_path/'.env.sepolia'
    for key,value in {'DATABASE_URL':repo.database_url,'CHAIN_ID':'11155111',
                      'CHAIN_CONFIRMATIONS':'3','CHAIN_RPC_URL':'https://example.com'}.items():
        set_key(env,key,value)
    monkeypatch.setattr(sepolia_demo,'ENV',env)
    monkeypatch.setattr(sepolia_demo,'SCHEMA',schema)
    real_review=sepolia_demo.review
    def interrupted(*args,**kwargs):
        raise RuntimeError('Simulated interruption after account creation')
    monkeypatch.setattr(sepolia_demo,'review',interrupted)
    with pytest.raises(RuntimeError,match='Simulated interruption'):
        sepolia_demo.setup()
    saved_secret=dotenv_values(env)['SECRET_KEY']
    monkeypatch.setattr(sepolia_demo,'review',real_review)
    sepolia_demo.setup()
    assert dotenv_values(env)['SECRET_KEY']==saved_secret
    with repo.connect() as conn:
        buyer=conn.execute("SELECT user_id FROM auth_accounts WHERE username='yash_sepolia'").fetchone()['user_id']
        conn.execute("UPDATE parcels SET current_owner_user_id=%s WHERE ulpin='DEMO-SEPOLIA-001'",(buyer,))
        conn.execute("UPDATE ownerships SET user_id=%s WHERE parcel_id='DEMO-SEPOLIA-001'",(buyer,))
    sepolia_demo.setup()
    with repo.connect() as conn:
        assert conn.execute("SELECT current_owner_user_id FROM parcels WHERE ulpin='DEMO-SEPOLIA-001'").fetchone()['current_owner_user_id']==buyer
        assert conn.execute("SELECT count(*) AS n FROM ownerships WHERE parcel_id='DEMO-SEPOLIA-001'").fetchone()['n']==1
