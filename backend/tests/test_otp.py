"""OTP integration uses real PostgreSQL and fake network delivery; never sends messages."""
from fastapi import HTTPException
import pytest

from app.auth import otp
from tests.test_auth_postgres import postgres_auth


class FakeDelivery:
    email_code = None
    sms_checks = 0

    def send_email(self, email, code):
        self.email_code = code

    def send_sms(self, phone):
        assert phone == '+919876543210'
        return 'VE' + '1' * 32

    def verify_sms(self, sid, code):
        self.sms_checks += 1
        return sid == 'VE' + '1' * 32 and code == '654321'


@pytest.fixture
def otp_login(postgres_auth, monkeypatch):
    client, repository = postgres_auth
    sender = FakeDelivery()
    monkeypatch.setattr(otp, 'get_delivery', lambda request: sender)
    client.app.state.settings.login_otp_enabled = True
    signup = client.post('/api/auth/signup', json=dict(name='OTP Citizen', email='otp@example.com',
        username='otp_citizen', password='Password 123!', phone='9876543210', aadhaar='234567890123'))
    assert signup.status_code == 201 and signup.json()['login_required']
    assert 'set-cookie' not in signup.headers
    payload = dict(identifier='otp@example.com', password='Password 123!')
    response = client.post('/api/auth/login', json=payload)
    assert response.status_code == 200 and response.json()['otp_required']
    assert 'access_token' not in response.json()
    return client, repository, sender, response.json()['challenge_id'], payload


def verify(client, sender, challenge_id, **changes):
    return client.post('/api/auth/otp/verify', json=dict(challenge_id=challenge_id,
        email_code=sender.email_code, sms_code='654321') | changes)


def test_requires_both_codes_and_prevents_replay(otp_login):
    client, repository, sender, challenge_id, _ = otp_login
    assert client.get('/api/auth/me').status_code == 401
    wrong_email = f'{(int(sender.email_code) + 1) % 1000000:06d}'
    assert verify(client, sender, challenge_id, email_code=wrong_email).status_code == 401
    assert sender.sms_checks == 0
    assert verify(client, sender, challenge_id, sms_code='123456').status_code == 401
    response = verify(client, sender, challenge_id)
    assert response.status_code == 200
    assert response.json()['user']['emailVerified'] and response.json()['user']['phoneVerified']
    assert client.get('/api/auth/me').status_code == 200
    assert verify(client, sender, challenge_id).status_code == 401
    with repository.connect() as conn:
        row = conn.execute('SELECT * FROM login_challenges WHERE id=%s', (challenge_id,)).fetchone()
    assert row['consumed'] and row['attempts'] == 3
    assert sender.email_code not in row['email_code_hash']


def test_attempt_limit(otp_login):
    client, _, sender, challenge_id, _ = otp_login
    for _ in range(5):
        assert verify(client, sender, challenge_id, sms_code='123456').status_code == 401
    assert verify(client, sender, challenge_id).status_code == 401
    assert sender.sms_checks == 5


def test_expiry_and_new_login_invalidates_old_challenge(otp_login):
    client, repository, sender, challenge_id, payload = otp_login
    replacement = client.post('/api/auth/login', json=payload).json()['challenge_id']
    assert verify(client, sender, challenge_id).status_code == 401
    with repository.connect() as conn:
        conn.execute("UPDATE login_challenges SET expires_at=now()-interval '1 second' WHERE id=%s", (replacement,))
    assert verify(client, sender, replacement).status_code == 401


def test_provider_failure_never_creates_session(otp_login, monkeypatch):
    client, repository, sender, _, payload = otp_login

    def unavailable(phone):
        raise HTTPException(503, 'SMS unavailable')

    monkeypatch.setattr(sender, 'send_sms', unavailable)
    response = client.post('/api/auth/login', json=payload)
    assert response.status_code == 503
    assert client.get('/api/auth/me').status_code == 401
    with repository.connect() as conn:
        assert conn.execute('SELECT count(*) AS total FROM auth_sessions').fetchone()['total'] == 0
        assert conn.execute('SELECT count(*) AS total FROM login_challenges WHERE NOT consumed').fetchone()['total'] == 0


def test_changed_contact_or_disabled_account_cannot_complete(otp_login):
    client, repository, sender, challenge_id, _ = otp_login
    with repository.connect() as conn:
        conn.execute("UPDATE auth_accounts SET phone='9123456789'")
    assert verify(client, sender, challenge_id).status_code == 401


def test_delivery_rejects_missing_configuration():
    from app.config import Settings
    with pytest.raises(HTTPException) as error:
        otp.Delivery(Settings(_env_file=None, secret_key='test'))
    assert error.value.status_code == 503
