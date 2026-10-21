"""Production HTTP boundary checks; never contact a real database or chain."""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.auth.routes import COOKIE_NAME, get_repository, passwords, token_hash
from app.auth.schemas import Signup
from app.config import Settings
from app.main import create_app
from tests.test_auth import MemoryAccounts


def production(**changes):
    return Settings(_env_file=None, **(dict(
        app_env='production', secret_key='73ede71eb14a538a51dd23f20188cb9e7a93aff8173b8bf290d02552cfcc61ee',
        sale_token_secret='fcd9b95bb078d8eb74c431b0f67f4dd1a08159be4edc503499e93d3f4c383461',
        database_url='host=db.example.com dbname=titlelock user=titlelock_app sslmode=verify-full sslrootcert=system',
        trusted_hosts=['titlelock.example.com'], frontend_origins=['https://titlelock.example.com'],
        chain_mode='live', chain_id=11155111, chain_rpc_url='https://rpc.example.com/private-api-key',
        chain_contract_address='0x'+'12'*20, chain_deployment_block=100, chain_confirmations=3,
    ) | changes))


@pytest.mark.parametrize('changes', [
    {'secret_key':'change-me'}, {'sale_token_secret':''}, {'sale_token_secret':'x'*64},
    {'registrar_signup_code':'public-demo-code'}, {'trusted_hosts':[]}, {'trusted_hosts':['*']}, {'trusted_hosts':['localhost']}, {'trusted_hosts':['127.0.0.1']},
    {'frontend_origins':['https://evil.example.com']}, {'frontend_origins':['http://titlelock.example.com']},
    {'frontend_origins':['https://titlelock.example.com/path']}, {'frontend_origins':['*']}, {'database_url':''},
    {'database_url':'host=db.example.com dbname=titlelock user=postgres sslmode=verify-full'},
    {'database_url':'host=db.example.com dbname=titlelock_auth_test user=app sslmode=verify-full'},
    {'database_url':'host=db.example.com dbname=titlelock user=app sslmode=require'},
    {'chain_mode':'mock'}, {'chain_contract_address':'0x'+'00'*20},
    {'otp_test_recipient_email':'test@example.com'}, {'login_otp_enabled':True},
])
def test_production_rejects_unsafe_settings(changes):
    with pytest.raises(ValidationError):
        production(**changes)


def test_independent_secrets_and_private_validation_errors():
    settings=production()
    with pytest.raises(ValidationError,match='independent'):
        production(sale_token_secret=settings.secret_key)
    assert settings.secret_key not in repr(settings)
    assert settings.chain_rpc_url not in repr(settings)
    with pytest.raises(ValidationError) as failure:
        production(database_url='bad-db-url-with-private-password')
    assert 'bad-db-url-with-private-password' not in str(failure.value)
    assert settings.secret_key not in str(failure.value)


def client():
    app=create_app(production())
    store=MemoryAccounts()
    app.dependency_overrides[get_repository]=lambda: store
    return TestClient(app,base_url='https://titlelock.example.com')


def test_production_https_host_docs_and_response_headers():
    browser=client()
    response=browser.get('/api/health')
    assert response.status_code==200
    assert response.headers['strict-transport-security']=='max-age=31536000'
    assert response.headers['x-frame-options']=='DENY'
    assert response.headers['x-content-type-options']=='nosniff'
    assert response.headers['cache-control']=='no-store'
    for path in ('/docs','/redoc','/openapi.json'):
        assert browser.get(path).status_code==404
    response=browser.get('http://titlelock.example.com/api/health',follow_redirects=False)
    assert response.status_code==307
    assert response.headers['location']=='https://titlelock.example.com/api/health'
    assert browser.get('/api/health',headers={'host':'attacker.example.com'}).status_code==400
    response=browser.get('http://titlelock.example.com/api/health',headers={'x-forwarded-proto':'https'},follow_redirects=False)
    assert response.status_code==307


def test_cors_and_cookie_origin_protection():
    browser=client()
    headers={'origin':'https://titlelock.example.com','access-control-request-method':'PATCH','access-control-request-headers':'content-type'}
    response=browser.options('/api/auth/profile',headers=headers)
    assert response.status_code==200
    assert response.headers['access-control-allow-origin']==headers['origin']
    assert response.headers['access-control-allow-credentials']=='true'
    response=browser.options('/api/auth/profile',headers=headers|{'origin':'https://attacker.example.com'})
    assert response.status_code==400
    assert 'access-control-allow-origin' not in response.headers
    assert browser.post('/api/auth/logout',headers={'origin':'https://attacker.example.com'}).status_code==403
    browser.cookies.set(COOKIE_NAME,'untrusted-cookie')
    assert browser.post('/api/auth/logout').status_code==403
    assert browser.post('/api/auth/logout',headers={'sec-fetch-site':'cross-site'}).status_code==403


def test_production_session_cookie_is_secure_and_local_development_unchanged():
    browser=client()
    response=browser.post('/api/auth/signup',headers={'origin':'https://titlelock.example.com'},json=dict(
        username='citizen',name='Citizen',email='citizen@example.com',password='A secure password 123!',aadhaar='234567890123'))
    assert response.status_code==201
    cookie=response.headers['set-cookie'].lower()
    assert 'secure' in cookie and 'httponly' in cookie and 'samesite=strict' in cookie and 'path=/api' in cookie
    dev=TestClient(create_app(Settings(_env_file=None,app_env='testing')))
    assert dev.get('/api/health').status_code==200
    assert dev.get('/docs').status_code==200


def test_known_demo_accounts_are_blocked_in_production():
    browser=client()
    response=browser.post('/api/auth/signup',headers={'origin':'https://titlelock.example.com'},json=dict(
        username='property_demo',name='Demo',email='demo@example.com',password='A secure password 123!',aadhaar='234567890123'))
    assert response.status_code==403


def test_existing_demo_password_and_session_cannot_access_production():
    browser=client()
    store=browser.app.dependency_overrides[get_repository]()
    data=Signup(username='property_demo',name='Demo',email='demo@example.com',password='Known demo password!',aadhaar='234567890123')
    account=store.create_user(data,passwords.hash(data.password.get_secret_value()))
    response=browser.post('/api/auth/login',json={'identifier':'demo@example.com','password':'Known demo password!'})
    assert response.status_code==401
    store.create_session(account['user_id'],token_hash('old-demo-token'),24)
    assert browser.get('/api/auth/me',headers={'authorization':'Bearer old-demo-token'}).status_code==401
