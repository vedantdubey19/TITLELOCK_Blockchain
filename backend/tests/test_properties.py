from uuid import uuid4

from app.cli.link_identity import approve
from tests.test_auth_postgres import postgres_auth


def test_ownership_requires_approved_link_and_active_share(postgres_auth):
    client, repository = postgres_auth
    assert client.get('/api/properties/my').status_code == 401
    assert client.get('/api/properties/OWN').status_code == 401
    payload = dict(name='Same Name', username='owner', email='owner@example.com', password='Password 123!', aadhaar='234567890123')
    client.post('/api/auth/signup', json=payload)
    registry, other = uuid4(), uuid4()
    with repository.connect() as conn:
        conn.execute('''CREATE TABLE parcels (ulpin text PRIMARY KEY,ownership_type text,frozen boolean,
            survey_number text,area_sqm numeric,registration_office text,last_registered_date date,
            title_status text,risk_status text,transfer_history jsonb,current_owner_user_id uuid,freeze_reason text)''')
        conn.execute('CREATE TABLE ownerships(id uuid DEFAULT gen_random_uuid(),parcel_id text,user_id uuid,active boolean,share_bps integer DEFAULT 10000)')
        for table in ('encumbrances', 'disputes'):
            conn.execute(f'CREATE TABLE {table}(id uuid DEFAULT gen_random_uuid(),parcel_id text,status text,details jsonb,created_at timestamptz DEFAULT now())')
            conn.execute(f"INSERT INTO {table}(parcel_id,status,details) VALUES ('OWN','ACTIVE', '{{\"type\":\"Recorded claim\"}}'),('OTHER','PRIVATE','{{}}')")
        for identity in (registry, other):
            conn.execute('INSERT INTO users(id,identity_reference,display_name) VALUES (%s,%s,%s)',
                         (identity,str(identity),'Same Name'))
        for parcel, identity, active in [('OWN',registry,True),('OLD',registry,False),('OTHER',other,True)]:
            conn.execute('INSERT INTO parcels(ulpin,current_owner_user_id) VALUES (%s,%s)', (parcel,identity))
            conn.execute('INSERT INTO ownerships(parcel_id,user_id,active) VALUES (%s,%s,%s)', (parcel,identity,active))
    assert client.get('/api/properties/my').json()['properties'] == []
    response = client.post('/api/properties/identity-link',json=dict(registry_user_id=str(registry),evidence_reference='office-check-123'))
    assert response.status_code == 201
    assert client.get('/api/properties/my').json()['properties'] == []
    assert client.get('/api/properties/OWN').status_code == 404
    approve(repository, response.json()['id'], 'verified-original-documents-123')
    body = client.get('/api/properties/my').json()
    assert body['identity_linked'] is True
    assert [p['ulpin'] for p in body['properties']] == ['OWN']
    detail = client.get('/api/properties/OWN')
    assert detail.status_code == 200
    assert detail.headers['cache-control'] == 'no-store'
    record = detail.json()
    assert record['owners'] == [{'name': 'Same Name', 'share_bps': 10000}]
    assert record['encumbrances'][0]['details'] == {'type': 'Recorded claim'}
    assert len(record['encumbrances']) == len(record['disputes']) == 1
    for parcel in ('OLD', 'OTHER', 'MISSING'):
        assert client.get('/api/properties/' + parcel).status_code == 404
    with repository.connect() as conn:
        conn.execute("UPDATE ownerships SET active=false WHERE parcel_id='OWN'")
    assert client.get('/api/properties/OWN').status_code == 404
    with repository.connect() as conn:
        conn.execute("UPDATE ownerships SET active=true WHERE parcel_id='OWN'")
    client.post('/api/auth/logout')
    client.post('/api/auth/signup',json=payload | dict(username='stranger',email='stranger@example.com'))
    assert client.get('/api/properties/my').json()['properties'] == []
    assert client.get('/api/properties/identity-link').json() == []

    assert client.get('/api/properties/OWN').status_code == 404
    with repository.connect() as conn:
        account = repository.find_user('stranger')
        conn.execute("INSERT INTO ownerships(parcel_id,user_id,active,share_bps) VALUES ('OTHER',%s,true,2500)",
                     (account['user_id'],))
        conn.execute("UPDATE ownerships SET share_bps=7500 WHERE parcel_id='OTHER' AND user_id=%s", (other,))
    record = client.get('/api/properties/OTHER').json()
    assert sorted(owner['share_bps'] for owner in record['owners']) == [2500, 7500]
    assert record['encumbrances'][0]['status'] == 'PRIVATE'
    with repository.connect() as conn:
        conn.execute("UPDATE auth_accounts SET role='REGISTRAR' WHERE user_id=%s", (account['user_id'],))
    assert client.get('/api/properties/OTHER').status_code == 403
