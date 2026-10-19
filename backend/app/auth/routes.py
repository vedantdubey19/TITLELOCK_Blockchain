import hashlib
import hmac
import secrets

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from .repository import AuthRepository
from .schemas import AuthResponse, Login, Signup, User, OTPChallenge, OTPVerification, SignupCreated
from . import otp

def check_origin(request: Request):
    origin = request.headers.get('origin')
    allowed = request.app.state.settings.frontend_origins + [str(request.base_url).rstrip('/')]
    if request.method != 'GET' and origin and origin not in allowed:
        raise HTTPException(403, 'Untrusted request origin')


router = APIRouter(prefix='/api/auth', tags=['auth'], dependencies=[Depends(check_origin)],
                   responses={401: {'description': 'Invalid or expired session'},
                              403: {'description': 'Access denied'}})
bearer = HTTPBearer(auto_error=False)
COOKIE_NAME = 'titlelock_session'
passwords = PasswordHash.recommended()
dummy_hash = passwords.hash(secrets.token_urlsafe(32))


def get_repository(request: Request):
    url = request.app.state.settings.database_url
    if not url:
        raise HTTPException(503, 'Authentication database is not configured')
    return AuthRepository(url)


def token_hash(token: str):
    return hashlib.sha256(token.encode()).hexdigest()


def aadhaar_digest(number, request):
    key = request.app.state.settings.secret_key
    if not key:
        raise HTTPException(503, 'SECRET_KEY must be configured for Aadhaar storage')
    return hmac.new(key.encode(), ('titlelock:aadhaar:' + number).encode(), hashlib.sha256).hexdigest()


def public_user(account):
    return User(
        id=str(account['user_id']), name=account['name'], email=account['email'],
        username=account['username'], phone=account['phone'], jurisdiction=account['jurisdiction'],
        description=account['description'],
        role=account['role'], status=account['status'],
        activeRole='REGISTRAR' if account['role'] == 'REGISTRAR' else 'OWNER',
        aadhaarLast4=account.get('aadhaar_last4'),
        emailVerified=bool(account.get('email_verified_at')),
        phoneVerified=bool(account.get('phone_verified_at')),
    )


def issue_session(account, request, response, repository, mfa_verified=False):
    token = secrets.token_urlsafe(32)
    ttl = request.app.state.settings.session_ttl_hours
    repository.create_session(account['user_id'], token_hash(token), ttl, mfa_verified)
    response.set_cookie(COOKIE_NAME, token, max_age=ttl * 3600, httponly=True,
                        secure=request.app.state.settings.app_env == 'production',
                        samesite='strict', path='/api')
    return AuthResponse(access_token=token, expires_in=ttl * 3600, user=public_user(account))


def check_attempts(request, repository, identifier=None):
    # Shared PostgreSQL counters work across API workers and restarts.
    host = request.client.host if request.client else 'unknown'
    allowed = repository.allow_attempt('ip:' + token_hash(host), 100)
    if allowed and identifier is not None:
        allowed = repository.allow_attempt('login:' + token_hash(identifier.strip().lower()), 10)
    if not allowed:
        raise HTTPException(429, 'Too many attempts; retry in 15 minutes', headers={'Retry-After': '900'})


def session_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    return credentials.credentials if credentials else request.cookies.get(COOKIE_NAME)


def current_user(
    request: Request,
    token: str | None = Depends(session_token),
    repository=Depends(get_repository),
):
    account = repository.session_user(token_hash(token)) if token else None
    if not account or account['status'] != 'ACTIVE' or (request.app.state.settings.login_otp_enabled and not account.get('mfa_verified')):
        raise HTTPException(401, 'Invalid or expired session', headers={'WWW-Authenticate': 'Bearer'})
    return public_user(account)


def require_role(*roles):
    def check(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(403, 'This account does not have permission')
        return user
    return check


@router.post('/signup', response_model=AuthResponse | SignupCreated, status_code=201)
def signup(data: Signup, request: Request, response: Response, repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    check_attempts(request, repository)
    if data.role == 'REGISTRAR':
        expected = request.app.state.settings.registrar_signup_code.get_secret_value()
        provided = data.registrarCode.get_secret_value()
        if not expected or not secrets.compare_digest(provided.encode(), expected.encode()):
            raise HTTPException(403, 'Valid registrar authorization code required')
    try:
        number = data.aadhaar.get_secret_value() if data.role == 'CITIZEN' else None
        digest = aadhaar_digest(number, request) if number else None
        account = repository.create_user(data, passwords.hash(data.password.get_secret_value()),
                                         digest, number[-4:] if number else None)
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, 'Email or username is already registered') from None
    if request.app.state.settings.login_otp_enabled:
        return SignupCreated()
    return issue_session(account, request, response, repository)


@router.post('/login', response_model=AuthResponse | OTPChallenge)
def login(data: Login, request: Request, response: Response, repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    check_attempts(request, repository, data.identifier)
    account = repository.find_user(data.identifier)
    valid = passwords.verify(data.password.get_secret_value(), account['password_hash'] if account else dummy_hash)
    if not account or not valid or account['status'] != 'ACTIVE':
        raise HTTPException(401, 'Invalid credentials', headers={'WWW-Authenticate': 'Bearer'})
    if data.expectedRole and account['role'] != data.expectedRole:
        raise HTTPException(403, 'Use the correct portal for this account')
    if request.app.state.settings.login_otp_enabled:
        if not repository.allow_attempt('otp-send:' + str(account['user_id']), 3):
            raise HTTPException(429, 'Too many OTP sends; retry in 15 minutes')
        # Clear any old browser session before starting a new login.
        response.delete_cookie(COOKIE_NAME, path='/api')
        return otp.start_challenge(account, request, repository)
    return issue_session(account, request, response, repository)


@router.post('/otp/verify', response_model=AuthResponse)
def verify_otp(data: OTPVerification, request: Request, response: Response, repository=Depends(get_repository)):
    if not request.app.state.settings.login_otp_enabled:
        raise HTTPException(409, 'Login OTP is not enabled')
    response.headers['Cache-Control'] = 'no-store'
    check_attempts(request, repository)
    digest = otp.code_hash(request.app.state.settings.secret_key, data.challenge_id, 'email', data.email_code.get_secret_value())
    account = repository.verify_challenge(data.challenge_id, digest, data.sms_code.get_secret_value(), otp.get_delivery(request))
    if not account:
        raise HTTPException(401, 'Invalid, expired, or already used OTP challenge')
    return issue_session(account, request, response, repository, mfa_verified=True)


@router.get('/me', response_model=User)
def me(response: Response, user: User = Depends(current_user)):
    response.headers['Cache-Control'] = 'no-store'
    return user


@router.post('/logout', status_code=204)
def logout(
    user: User = Depends(current_user),
    token: str = Depends(session_token),
    repository=Depends(get_repository),
):
    repository.revoke_session(token_hash(token))
    response = Response(status_code=204, headers={'Cache-Control': 'no-store'})
    response.delete_cookie(COOKIE_NAME, path='/api')
    return response
