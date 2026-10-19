"""Opt-in SQL/HTTP integration against an isolated schema in a test database."""

import os
from pathlib import Path
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from app.auth.repository import AuthRepository
from app.auth.routes import token_hash
from app.config import Settings
from app.main import create_app


@pytest.fixture
def postgres_auth():
    url = os.environ.get('AUTH_TEST_DATABASE_URL')
    if not url:
        pytest.skip('AUTH_TEST_DATABASE_URL is not configured')
    schema = 'auth_test_' + uuid4().hex
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
    scoped_url = make_conninfo(url, options=f'-c search_path={schema}')
    try:
        with psycopg.connect(scoped_url, autocommit=True) as conn:
            # Exact users columns present in the supplied backup; no project data is touched.
            conn.execute('''CREATE TABLE users (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identity_reference text UNIQUE NOT NULL,
                display_name text, account_status text NOT NULL DEFAULT 'ACTIVE',
                created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())''')
            migration = '\n'.join(p.read_text() for p in sorted((Path(__file__).parents[1] / 'migrations').glob('*.sql')))
            conn.execute(migration)
            conn.execute(migration)  # Safe to apply twice.
        client = TestClient(create_app(Settings(_env_file=None, app_env='testing', secret_key='test-secret-key', database_url=scoped_url)))
        yield client, AuthRepository(scoped_url)
    finally:
        with psycopg.connect(url, autocommit=True) as conn:
            conn.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))


def test_postgres_signup_login_revocation_and_expiry(postgres_auth):
    client, repository = postgres_auth
    payload = dict(name='Database Citizen', username='citizen', email='citizen@example.com', password='Password 123!', aadhaar='234567890123')
    registered = client.post('/api/auth/signup', json=payload)
    assert registered.status_code == 201
    assert client.post('/api/auth/signup', json=payload | {'username': 'other'}).status_code == 409
    with repository.connect() as conn:
        assert conn.execute('SELECT count(*) AS total FROM users').fetchone()['total'] == 1
    logged_in = client.post('/api/auth/login', json=dict(identifier='CITIZEN@EXAMPLE.COM', password='Password 123!'))
    assert logged_in.status_code == 200
    headers = {'Authorization': 'Bearer ' + logged_in.json()['access_token']}
    assert client.get('/api/auth/me', headers=headers).status_code == 200
    assert client.post('/api/auth/logout', headers=headers).status_code == 204
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    token = registered.json()['access_token']
    with repository.connect() as conn:
        conn.execute("UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = %s",
                     (token_hash(token),))
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_postgres_shared_rate_limit_window(postgres_auth):
    _, repository = postgres_auth
    assert repository.allow_attempt('test', 1)
    assert not AuthRepository(repository.database_url).allow_attempt('test', 1)
    with repository.connect() as conn:
        conn.execute("UPDATE auth_rate_limits SET resets_at = now() - interval '1 second' WHERE key = 'test'")
    assert repository.allow_attempt('test', 1)
