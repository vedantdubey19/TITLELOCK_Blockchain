from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from pydantic import SecretStr

from tests.test_auth_postgres import postgres_auth


@pytest.fixture
def sales(postgres_auth):
    client, repo = postgres_auth
    client.app.state.settings.sale_token_secret = SecretStr('independent-test-sale-secret')
    client.app.state.settings.registrar_signup_code = SecretStr('test-registrar-code')
    accounts = {}
    for name, role in [('owner','CITIZEN'),('coowner','CITIZEN'),('buyer','CITIZEN'),('registrar','REGISTRAR'),('otherregistrar','REGISTRAR')]:
        data = dict(name=name, username=name, email=f'{name}@example.com', password='Password 123!', role=role)
        data.update(dict(registrarCode='test-registrar-code') if role == 'REGISTRAR' else dict(aadhaar='234567890123'))
        response = client.post('/api/auth/signup',json=data)
        assert response.status_code == 201
        accounts[name] = response.json()
    with repo.connect() as conn:
        conn.execute('''CREATE TABLE parcels(ulpin text PRIMARY KEY,frozen boolean NOT NULL DEFAULT false,title_status text DEFAULT 'VERIFIED',
            current_owner_user_id uuid,ownership_type text DEFAULT 'JOINT',last_registered_date date,
            transfer_history jsonb DEFAULT '[]',updated_at timestamptz DEFAULT now())''')
        conn.execute('''CREATE TABLE ownerships(id uuid DEFAULT gen_random_uuid(),parcel_id text,user_id uuid,share_bps integer,active boolean)''')
        for parcel in ('LAND-1','LAND-2'):
            conn.execute('INSERT INTO parcels(ulpin,current_owner_user_id) VALUES (%s,%s)',(parcel,accounts['owner']['user']['id']))
            for name, share in [('owner',6000),('coowner',4000)]:
                conn.execute('INSERT INTO ownerships(parcel_id,user_id,share_bps,active) VALUES (%s,%s,%s,true)',(parcel,accounts[name]['user']['id'],share))
    def call(name, method, path='', data=None):
        return client.request(method,'/api/sales'+path,headers={'Authorization':'Bearer '+accounts[name]['access_token']},json=data)
    def create(parcel='LAND-1'):
        return call('registrar','POST',data=dict(parcel_id=parcel,buyer_username='buyer',document_hash='test-document-hash'))
    return repo, accounts, call, create


def test_two_keys_all_owners_atomic_completion(sales):
    repo, accounts, call, create = sales
    assert call('owner','POST',data=dict(parcel_id='LAND-1',buyer_username='buyer',document_hash='test-doc-hash')).status_code == 403
    sale = create().json()['id']
    assert create().status_code == 409
    assert call('buyer','GET').json()[0]['is_owner'] is False
    assert call('otherregistrar','GET').json() == []
    assert call('buyer','POST',f'/{sale}/keys/owner',{}).status_code == 403
    assert call('otherregistrar','POST',f'/{sale}/keys/registrar',{}).status_code == 403
    keys = {}
    for name, side in [('registrar','registrar'),('owner','owner'),('coowner','owner')]:
        result = call(name,'POST',f'/{sale}/keys/{side}',{})
        assert result.status_code == 200
        assert result.headers['cache-control'] == 'no-store'
        keys[name] = result.json()['key']
        assert call(name,'POST',f'/{sale}/keys/{side}',{}).status_code == 409
    assert len(set(keys.values())) == 3
    with repo.connect() as conn:
        saved = str(conn.execute('SELECT * FROM sale_requests').fetchall()) + str(conn.execute('SELECT * FROM sale_owner_approvals').fetchall())
        assert all(key not in saved for key in keys.values())
        deadline = conn.execute("SELECT expires_at-created_at AS duration FROM sale_requests WHERE id=%s",(sale,)).fetchone()['duration']
        assert timedelta(hours=24) <= deadline < timedelta(hours=24,minutes=1)
    assert call('registrar','POST',f'/{sale}/complete',{}).status_code == 409
    assert call('registrar','POST',f'/{sale}/approve/registrar',{'key':keys['owner']}).status_code == 401
    for name, side in [('registrar','registrar'),('owner','owner')]:
        assert call(name,'POST',f'/{sale}/approve/{side}',{'key':keys[name]}).status_code == 200
        assert call(name,'POST',f'/{sale}/approve/{side}',{'key':keys[name]}).status_code == 401
    assert call('registrar','POST',f'/{sale}/complete',{}).status_code == 409
    assert call('coowner','POST',f'/{sale}/approve/owner',{'key':keys['coowner']}).status_code == 200
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _:call('registrar','POST',f'/{sale}/complete',{}).status_code, range(2)))
    assert sorted(outcomes) == [200,409]
    with repo.connect() as conn:
        owners = conn.execute("SELECT user_id,share_bps FROM ownerships WHERE parcel_id='LAND-1' AND active").fetchall()
        assert owners == [{'user_id':__import__('uuid').UUID(accounts['buyer']['user']['id']), 'share_bps':10000}]
        assert conn.execute("SELECT current_owner_user_id FROM parcels WHERE ulpin='LAND-1'").fetchone()['current_owner_user_id'] == owners[0]['user_id']
        assert conn.execute('SELECT count(*) AS n FROM sale_requests WHERE status=\'COMPLETED\'').fetchone()['n'] == 1


def test_expiry_seven_day_cooldown_and_new_unique_keys(sales):
    repo, _, call, create = sales
    sale = create().json()['id']
    key = call('owner','POST',f'/{sale}/keys/owner',{}).json()['key']
    with repo.connect() as conn:
        conn.execute("UPDATE sale_requests SET expires_at=now()-interval '1 second' WHERE id=%s",(sale,))
    assert call('owner','POST',f'/{sale}/approve/owner',{'key':key}).status_code == 409
    assert call('registrar','GET').json()[0]['status'] == 'EXPIRED'
    assert create().status_code == 409
    with repo.connect() as conn:
        row = conn.execute('SELECT ps.cooldown_until-s.expires_at AS duration FROM sale_requests s JOIN sale_parcel_state ps USING(parcel_id) WHERE s.id=%s',(sale,)).fetchone()
        assert row['duration'] == timedelta(days=7)
        assert conn.execute('SELECT key_hash FROM sale_owner_approvals WHERE request_id=%s',(sale,)).fetchone()['key_hash'] is None
        conn.execute("UPDATE sale_parcel_state SET cooldown_until=now()-interval '1 second'")
        conn.execute("UPDATE parcels SET frozen=true WHERE ulpin='LAND-1'")
    assert create().status_code == 409  # Cooldown never clears a legal freeze.
    with repo.connect() as conn:
        conn.execute("UPDATE parcels SET frozen=false WHERE ulpin='LAND-1'")
    fresh = create().json()['id']
    fresh_key = call('owner','POST',f'/{fresh}/keys/owner',{}).json()['key']
    assert fresh_key != key
    assert call('owner','POST',f'/{fresh}/approve/owner',{'key':key}).status_code == 401


def test_changed_ownership_and_freeze(sales):
    repo, accounts, call, create = sales
    sale = create().json()['id']
    with repo.connect() as conn:
        conn.execute("UPDATE ownerships SET active=false WHERE parcel_id='LAND-1' AND user_id=%s",(accounts['coowner']['user']['id'],))
    assert call('owner','POST',f'/{sale}/keys/owner',{}).status_code == 409
    second = create('LAND-2').json()['id']
    with repo.connect() as conn:
        conn.execute("UPDATE parcels SET frozen=true WHERE ulpin='LAND-2'")
    assert call('owner','POST',f'/{second}/keys/owner',{}).status_code == 409


def test_cross_request_secret_and_completed_approvals_expire(sales):
    repo, _, call, create = sales
    first = create().json()['id']
    second = create('LAND-2').json()['id']
    key = call('owner','POST',f'/{first}/keys/owner',{}).json()['key']
    call('owner','POST',f'/{second}/keys/owner',{})
    assert call('owner','POST',f'/{second}/approve/owner',{'key':key}).status_code == 401
    for name, side in [('owner','owner'),('coowner','owner'),('registrar','registrar')]:
        raw = key if name == 'owner' else call(name,'POST',f'/{first}/keys/{side}',{}).json()['key']
        assert call(name,'POST',f'/{first}/approve/{side}',{'key':raw}).status_code == 200
    with repo.connect() as conn:
        conn.execute("UPDATE sale_requests SET expires_at=now()-interval '1 second' WHERE id=%s",(first,))
    assert call('registrar','POST',f'/{first}/complete',{}).status_code == 409
    with repo.connect() as conn:
        assert conn.execute("SELECT count(*) AS n FROM ownerships WHERE parcel_id='LAND-1' AND active").fetchone()['n'] == 2
