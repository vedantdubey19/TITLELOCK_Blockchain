from collections import Counter
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import psycopg
import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.auth.routes import get_repository, passwords, require_role
from app.config import Settings
from app.main import create_app


class MemoryAccounts:
    """Test double for persistence; HTTP/password/authorization code stays real."""

    def __init__(self):
        self.accounts, self.sessions, self.attempts = {}, {}, Counter()
        self.mfa = {}

    def create_user(self, data, password_hash, aadhaar_hash=None, aadhaar_last4=None):
        if any(a['email'] == str(data.email).lower() or a['username'] == data.username.lower()
               for a in self.accounts.values()):
            raise psycopg.errors.UniqueViolation()
        account = dict(user_id=str(uuid4()), name=data.name, email=str(data.email).lower(),
                       username=data.username.lower(), password_hash=password_hash, role=data.role,
                       status='ACTIVE', phone=data.phone, jurisdiction=data.jurisdiction,
                       description=data.description, aadhaar_hash=aadhaar_hash, aadhaar_last4=aadhaar_last4)
        self.accounts[account['user_id']] = account
        return account

    def find_user(self, identifier):
        return next((a for a in self.accounts.values()
                     if identifier.strip().lower() in (a['email'], a['username'])), None)

    def create_session(self, user_id, token_hash, ttl_hours, mfa_verified=False):
        self.sessions[token_hash] = (user_id, datetime.now(timezone.utc) + timedelta(hours=ttl_hours))
        self.mfa[token_hash] = mfa_verified

    def session_user(self, token_hash):
        session = self.sessions.get(token_hash)
        return self.accounts[session[0]] | {'mfa_verified': self.mfa.get(token_hash, False)} if session and session[1] > datetime.now(timezone.utc) else None

    def revoke_session(self, token_hash):
        self.sessions.pop(token_hash, None)

    def allow_attempt(self, key, limit):
        self.attempts[key] += 1
        return self.attempts[key] <= limit


@pytest.fixture
def auth():
    app = create_app(Settings(_env_file=None, app_env='testing', secret_key='test-secret-key', registrar_signup_code='private-test-code'))
    store = MemoryAccounts()
    app.dependency_overrides[get_repository] = lambda: store

    @app.get('/test/registrar')
    def registrar(user=Depends(require_role('REGISTRAR'))):
        return {'id': user.id}

    return TestClient(app), store


def signup(client, **changes):
    data = dict(name='Test Citizen', email='citizen@example.com', username='citizen',
                password='A secure password 123!', aadhaar='234567890123', phone='+91 9876543210', activeRole='OWNER')
    return client.post('/api/auth/signup', json=data | changes)


def authorization(response):
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def test_signup_session_and_logout(auth):
    client, store = auth
    response = signup(client)
    assert response.status_code == 201
    body = response.json()
    assert body['user']['role'] == 'CITIZEN' and body['user']['activeRole'] == 'OWNER'
    assert body['expires_in'] == 86400
    account = next(iter(store.accounts.values()))
    assert account['password_hash'].startswith('$argon2id$')
    assert passwords.verify('A secure password 123!', account['password_hash'])
    assert 'password' not in body['user'] and 'password_hash' not in body['user']
    assert body['access_token'] not in store.sessions
    headers = authorization(response)
    assert client.get('/api/auth/me', headers=headers).json() == body['user']
    assert client.post('/api/auth/logout', headers=headers).status_code == 204
    assert client.get('/api/auth/me', headers=headers).status_code == 401


@pytest.mark.parametrize('identifier', ['CITIZEN@EXAMPLE.COM', ' CITIZEN '])
def test_login_by_email_or_username(auth, identifier):
    client, _ = auth
    signup(client)
    response = client.post('/api/auth/login', json=dict(identifier=identifier,
                           password='A secure password 123!', expectedRole='CITIZEN'))
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'


def test_bad_credentials_and_portal_segregation(auth):
    client, _ = auth
    citizen = signup(client)
    for identifier in ['citizen', 'missing']:
        response = client.post('/api/auth/login', json=dict(identifier=identifier, password='wrong'))
        assert response.status_code == 401 and response.json()['detail'] == 'Invalid credentials'
    assert client.post('/api/auth/login', json=dict(identifier='citizen',
                       password='A secure password 123!', expectedRole='REGISTRAR')).status_code == 403
    assert client.get('/test/registrar', headers=authorization(citizen)).status_code == 403
    assert client.get('/test/registrar').status_code == 401


def test_registrar_requires_private_code(auth):
    client, _ = auth
    for code in ['', 'REG-GOV-2026', 'incorrect']:
        assert signup(client, role='REGISTRAR', activeRole='REGISTRAR', registrarCode=code).status_code == 403
    registrar = signup(client, role='REGISTRAR', activeRole='REGISTRAR', registrarCode='private-test-code')
    assert registrar.status_code == 201
    assert client.get('/test/registrar', headers=authorization(registrar)).status_code == 200
    assert client.post('/api/auth/login', json=dict(identifier='citizen',
                       password='A secure password 123!', expectedRole='CITIZEN')).status_code == 403
    client.app.state.settings.registrar_signup_code = SecretStr('')
    assert signup(client, username='second', email='second@example.com', role='REGISTRAR',
                  activeRole='REGISTRAR', registrarCode='private-test-code').status_code == 403


def test_duplicates_expiry_and_disabled_accounts(auth):
    client, store = auth
    response = signup(client)
    assert signup(client, email='CITIZEN@example.com', username='other').status_code == 409
    assert signup(client, username='CITIZEN', email='other@example.com').status_code == 409
    headers = authorization(response)
    session_hash = next(iter(store.sessions))
    user_id, _ = store.sessions[session_hash]
    store.sessions[session_hash] = (user_id, datetime.now(timezone.utc) - timedelta(seconds=1))
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    store.accounts[user_id]['status'] = 'SUSPENDED'
    store.sessions[session_hash] = (user_id, datetime.now(timezone.utc) + timedelta(hours=1))
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    assert client.post('/api/auth/login', json=dict(identifier='citizen',
                       password='A secure password 123!')).status_code == 401


@pytest.mark.parametrize('changes', [dict(email='bad'), dict(password='short'),
    dict(username='email@example.com'), dict(activeRole='REGISTRAR'), dict(role='ADMIN')])
def test_signup_validation(auth, changes):
    response = signup(auth[0], **changes)
    assert response.status_code == 422
    assert all('input' not in error for error in response.json()['detail'])


def test_frontend_signup_without_username(auth):
    client, _ = auth
    response = client.post('/api/auth/signup', json=dict(name='New Citizen', email='new@example.com',
        password='Long enough 123!', aadhaar='234567890123', role='CITIZEN', activeRole='OWNER', description='Citizen'))
    assert response.status_code == 201
    assert response.json()['user']['username'].startswith('user_')


def test_rate_limit_and_invalid_token(auth):
    client, _ = auth
    for _ in range(10):
        assert client.post('/api/auth/login', json=dict(identifier='unknown', password='wrong')).status_code == 401
    assert client.post('/api/auth/login', json=dict(identifier='UNKNOWN', password='wrong')).status_code == 429
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer invalid'}).status_code == 401


def test_missing_database_configuration():
    client = TestClient(create_app(Settings(_env_file=None, database_url='')))
    assert client.post('/api/auth/login', json=dict(identifier='citizen', password='wrong')).status_code == 503


def test_password_whitespace_is_preserved(auth):
    client, _ = auth
    assert signup(client, password='  password 123!  ').status_code == 201
    assert client.post('/api/auth/login', json=dict(identifier='citizen', password='  password 123!  ')).status_code == 200
    assert client.post('/api/auth/login', json=dict(identifier='citizen', password='password 123!')).status_code == 401


@pytest.mark.parametrize('error', [psycopg.OperationalError, psycopg.errors.UndefinedTable])
def test_database_failures_do_not_expose_details(auth, error):
    client, _ = auth

    def unavailable():
        raise error('private database details')

    client.app.dependency_overrides[get_repository] = unavailable
    response = client.post('/api/auth/login', json=dict(identifier='citizen', password='wrong'))
    assert response.status_code == 503
    assert 'private database details' not in response.text


def test_browser_cookie_session_and_logout(auth):
    client, _ = auth
    response = signup(client)
    cookie = response.headers['set-cookie']
    assert 'HttpOnly' in cookie and 'SameSite=strict' in cookie and 'Path=/api' in cookie
    assert client.get('/api/auth/me').status_code == 200
    response = client.post('/api/auth/logout', headers={'Origin': 'http://localhost:5173'})
    assert response.status_code == 204 and 'Max-Age=0' in response.headers['set-cookie']
    assert client.get('/api/auth/me').status_code == 401


def test_cross_origin_auth_requests_are_rejected(auth):
    client, _ = auth
    signup(client)
    assert client.post('/api/auth/logout', headers={'Origin': 'https://untrusted.example'}).status_code == 403
    assert client.get('/api/auth/me').status_code == 200


def test_production_cookie_requires_https(auth):
    client, _ = auth
    client.app.state.settings.app_env = 'production'
    response = signup(client)
    assert 'Secure' in response.headers['set-cookie']


def test_aadhaar_is_signup_only(auth):
    client, store = auth
    assert signup(client, aadhaar=None).status_code == 422
    assert signup(client, aadhaar='123456789012').status_code == 422
    response = signup(client)
    account = next(iter(store.accounts.values()))
    assert len(account['aadhaar_hash']) == 64 and account['aadhaar_last4'] == '0123'
    assert '234567890123' not in str(account)
    assert 'aadhaar_hash' not in response.json()['user']
    request = dict(identifier='citizen', password='A secure password 123!')
    assert client.post('/api/auth/login', json=request).status_code == 200


def test_existing_citizen_without_aadhaar_can_login(auth):
    client, store = auth
    signup(client)
    account = next(iter(store.accounts.values()))
    account['aadhaar_hash'] = account['aadhaar_last4'] = None
    request = dict(identifier='citizen', password='A secure password 123!')
    assert client.post('/api/auth/login', json=request).status_code == 200
    assert account['aadhaar_hash'] is None
