from uuid import uuid4

import pytest

from app.cli.review_officer import review as review_officer
from app.cli.link_identity import review as review_identity
from tests.test_auth_postgres import postgres_auth


def register(client, username='citizen', **extra):
    return client.post('/api/auth/signup',json=dict(name=username,username=username,email=username+'@example.com',
        password='Password 123!',aadhaar='234567890123',phone='+919876543210') | extra)


def test_profile_changes_preserve_permissions_and_revoke_contact_sessions(postgres_auth):
    client,repo=postgres_auth
    response=register(client,phone='+91 (98765) 43210')
    with repo.connect() as c:
        c.execute('UPDATE auth_accounts SET phone_verified_at=now()')
    token=response.json()['access_token']; headers={'Authorization':'Bearer '+token}
    profile=dict(name='Updated Name',email='citizen@example.com',phone='+919876543210',jurisdiction='Noida',description='Profile',residentialAddress='Test address')
    result=client.patch('/api/auth/profile',headers=headers,json=profile)
    assert result.status_code==200,result.text
    assert result.json()['user']['profile']['residentialAddress']=='Test address'
    assert result.json()['login_required'] is False
    assert result.json()['user']['phoneVerified'] is True
    assert client.get('/api/auth/me',headers=headers).json()['name']=='Updated Name'
    assert client.patch('/api/auth/profile',headers=headers,json=profile | {'role':'REGISTRAR'}).status_code==422
    assert client.patch('/api/auth/profile',headers=headers,json=profile | {'name':'   '}).status_code==422
    assert client.patch('/api/auth/profile',headers=headers,json=profile | {'phone':'not-a-number'}).status_code==422
    changed=profile | {'email':'updated@example.com'}
    assert client.patch('/api/auth/profile',headers=headers,json=changed).status_code==401
    with repo.connect() as c:
        c.execute('UPDATE auth_accounts SET email_verified_at=now(),phone_verified_at=now()')
    result=client.patch('/api/auth/profile',headers=headers,json=changed | {'currentPassword':'Password 123!'})
    assert result.status_code==200 and result.json()['login_required'] is True
    assert result.json()['user']['emailVerified'] is False
    assert result.json()['user']['phoneVerified'] is True
    assert client.get('/api/auth/me',headers=headers).status_code==401
    login=client.post('/api/auth/login',json=dict(identifier='updated@example.com',password='Password 123!'))
    assert login.status_code==200
    register(client,'other')
    other_headers={'Authorization':'Bearer '+login.json()['access_token']}
    result=client.patch('/api/auth/profile',headers=other_headers,json=changed | {'email':'other@example.com','currentPassword':'Password 123!'})
    assert result.status_code==409
    assert repo.find_user('citizen')['email']=='updated@example.com'


def test_officer_review_blocks_code_only_signup_and_revokes_access(postgres_auth):
    client,repo=postgres_auth
    client.app.state.settings.registrar_signup_code=__import__('pydantic').SecretStr('test-code')
    data=dict(role='REGISTRAR',registrarCode='test-code',officerId='OFFICER-123',jurisdiction='Noida')
    assert register(client,'missing',**{key:value for key,value in data.items() if key!='officerId'}).status_code==422
    result=register(client,'officer',**data)
    assert result.status_code==201 and result.json()['pendingApproval'] is True
    assert 'access_token' not in result.json()
    assert client.post('/api/auth/login',json=dict(identifier='officer',password='Password 123!')).status_code==403
    with repo.connect() as c:
        account=c.execute("SELECT * FROM auth_accounts WHERE username='officer'").fetchone()
        assert 'OFFICER-123' not in str(account)
        assert account['officer_id_last4']=='-123'
    secret=client.app.state.settings.secret_key
    with pytest.raises(ValueError):
        review_officer(repo,'officer','APPROVED','checked-originals',secret,'WRONG-OFFICER')
    review_officer(repo,'officer','APPROVED','checked-originals',secret,'officer-123')
    login=client.post('/api/auth/login',json=dict(identifier='officer',password='Password 123!'))
    assert login.status_code==200 and login.json()['user']['officerVerified'] is True
    headers={'Authorization':'Bearer '+login.json()['access_token']}
    assert client.get('/api/sales',headers=headers).status_code==200
    result=client.patch('/api/auth/profile',headers=headers,json=dict(name='Officer',email='officer@example.com',phone='+919876543210',jurisdiction='Different'))
    assert result.status_code==403
    review_officer(repo,'officer','REVOKED','no-longer-authorized',secret)
    assert client.get('/api/auth/me',headers=headers).status_code==401
    assert client.post('/api/auth/login',json=dict(identifier='officer',password='Password 123!')).status_code==403
    assert register(client,'duplicate',**(data | {'officerId':' officer-123 '})).status_code==409
    with repo.connect() as c:
        assert [r['decision'] for r in c.execute('SELECT decision FROM account_review_events ORDER BY id')]==['APPROVED','REVOKED']


def test_identity_claim_requires_operator_review_and_can_be_rejected(postgres_auth):
    client,repo=postgres_auth
    register(client)
    registry=uuid4()
    with repo.connect() as c:
        c.execute('INSERT INTO users(id,identity_reference,display_name) VALUES (%s,%s,%s)',(registry,'registry-test','Original Owner'))
    request=client.post('/api/properties/identity-link',json=dict(registry_user_id=str(registry),evidence_reference='submitted-documents')).json()
    review_identity(repo,request['id'],'insufficient-evidence','REJECTED')
    assert client.get('/api/properties/identity-link').json()[0]['status']=='REJECTED'
    with repo.connect() as c:
        assert c.execute('SELECT count(*) AS n FROM account_identity_links').fetchone()['n']==0
    request=client.post('/api/properties/identity-link',json=dict(registry_user_id=str(registry),evidence_reference='new-documents')).json()
    review_identity(repo,request['id'],'checked-original-owner')
    with pytest.raises(ValueError):
        review_identity(repo,request['id'],'cannot-repeat-review')
    with repo.connect() as c:
        assert c.execute('SELECT count(*) AS n FROM account_identity_links').fetchone()['n']==1
        assert c.execute('SELECT reviewed_by_operator FROM identity_link_requests WHERE id=%s',(request['id'],)).fetchone()['reviewed_by_operator']


def test_short_officer_id_is_never_saved_as_plaintext_suffix(postgres_auth):
    client,repo=postgres_auth
    client.app.state.settings.registrar_signup_code=__import__('pydantic').SecretStr('test-code')
    assert register(client,'short_officer',role='REGISTRAR',registrarCode='test-code',officerId='abc').status_code==201
    with repo.connect() as c:
        row=c.execute("SELECT officer_id_hash,officer_id_last4 FROM auth_accounts WHERE username='short_officer'").fetchone()
        assert row['officer_id_hash'] and row['officer_id_last4'] is None
    review_officer(repo,'short_officer','APPROVED','checked-short-officer-id',client.app.state.settings.secret_key,'ABC')
    assert repo.find_user('short_officer')['officer_id_last4'] is None
