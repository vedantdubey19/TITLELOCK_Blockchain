import hashlib
import hmac
import secrets
import re

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from .repository import AuthRepository
from .schemas import AuthResponse, Login, Signup, User, OTPChallenge, OTPVerification, SignupCreated, PendingOfficer, ProfileUpdate
from . import otp
from .identity import officer_fingerprint, officer_suffix
from psycopg.types.json import Jsonb

def check_origin(request: Request):
    if request.method in ('GET', 'HEAD', 'OPTIONS'):
        return
    settings = request.app.state.settings
    origin = request.headers.get('origin')
    allowed = settings.frontend_origins
    if settings.app_env != 'production':
        allowed = allowed + [str(request.base_url).rstrip('/')]
    if origin and origin not in allowed:
        raise HTTPException(403, 'Untrusted request origin')
    if settings.app_env == 'production' and (
        request.headers.get('sec-fetch-site') == 'cross-site' or
        (request.cookies.get(COOKIE_NAME) and not origin and not request.headers.get('authorization'))
    ):
        raise HTTPException(403, 'Trusted browser origin required')


router = APIRouter(prefix='/api/auth', tags=['auth'], dependencies=[Depends(check_origin)],
                   responses={401: {'description': 'Invalid or expired session'},
                              403: {'description': 'Access denied'}})
bearer = HTTPBearer(auto_error=False)
COOKIE_NAME = 'titlelock_session'
DEMO_USERNAMES = {'property_demo', 'registrar_demo', 'vedant_sepolia', 'yash_sepolia', 'rahul_sepolia'}


def production_demo(request, account):
    return request.app.state.settings.app_env == 'production' and account['username'].lower() in DEMO_USERNAMES

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
        officerVerified=bool(account.get('officer_verified_at')),
        profile=account.get('profile') or {},
    )


def issue_session(account, request, response, repository, mfa_verified=False):
    if production_demo(request, account):
        raise HTTPException(403,'Demonstration accounts are disabled in production')
    if account['role']=='REGISTRAR' and not account.get('officer_verified_at'):
        raise HTTPException(403,'Registrar identity approval is required')
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
    if not account or production_demo(request, account) or account['status'] != 'ACTIVE' or (request.app.state.settings.login_otp_enabled and not account.get('mfa_verified')):
        raise HTTPException(401, 'Invalid or expired session', headers={'WWW-Authenticate': 'Bearer'})
    if account['role'] == 'REGISTRAR' and not account.get('officer_verified_at'):
        raise HTTPException(403, 'Registrar identity approval is required')
    return public_user(account)


def require_role(*roles):
    def check(user: User = Depends(current_user)):
        if user.role not in roles:
            raise HTTPException(403, 'This account does not have permission')
        return user
    return check


@router.post('/signup', response_model=AuthResponse | SignupCreated | PendingOfficer, status_code=201)
def signup(data: Signup, request: Request, response: Response, repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    check_attempts(request, repository)
    if production_demo(request, {'username': data.username}):
        raise HTTPException(403, 'Reserved demonstration username')
    if data.role == 'REGISTRAR':
        expected = request.app.state.settings.registrar_signup_code.get_secret_value()
        provided = data.registrarCode.get_secret_value()
        if not expected or not secrets.compare_digest(provided.encode(), expected.encode()):
            raise HTTPException(403, 'Valid registrar authorization code required')
    try:
        number = data.aadhaar.get_secret_value() if data.role == 'CITIZEN' else None
        digest = aadhaar_digest(number, request) if number else None
        officer_id = data.officerId.get_secret_value().strip() if data.role == 'REGISTRAR' else None
        if officer_id and not request.app.state.settings.secret_key:
            raise HTTPException(503, 'SECRET_KEY is required for officer identity storage')
        officer_hash = officer_fingerprint(request.app.state.settings.secret_key, officer_id) if officer_id else None
        account = repository.create_user(data, passwords.hash(data.password.get_secret_value()),
                                         digest, number[-4:] if number else None, officer_hash, officer_suffix(officer_id) if officer_id else None)
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, 'Email, username, or officer ID is already registered') from None
    if data.role == 'REGISTRAR':
        response.delete_cookie(COOKIE_NAME, path='/api')
        return PendingOfficer()
    if request.app.state.settings.login_otp_enabled:
        return SignupCreated()
    return issue_session(account, request, response, repository)


@router.post('/login', response_model=AuthResponse | OTPChallenge)
def login(data: Login, request: Request, response: Response, repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    check_attempts(request, repository, data.identifier)
    account = repository.find_user(data.identifier)
    valid = passwords.verify(data.password.get_secret_value(), account['password_hash'] if account else dummy_hash)
    if not account or not valid or production_demo(request, account) or account['status'] != 'ACTIVE':
        raise HTTPException(401, 'Invalid credentials', headers={'WWW-Authenticate': 'Bearer'})
    if account['role'] == 'REGISTRAR' and not account.get('officer_verified_at'):
        raise HTTPException(403, 'Registrar identity approval is required')
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


@router.patch('/profile')
def update_profile(data: ProfileUpdate, request: Request, response: Response,
                   user=Depends(current_user), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    if not repository.allow_attempt('profile:'+user.id,10):
        raise HTTPException(429,'Too many profile updates; retry in 15 minutes')
    try:
        with repository.connect() as conn:
            account = conn.execute('SELECT a.*,u.account_status FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=%s FOR UPDATE OF a,u',(user.id,)).fetchone()
            if account['account_status']!='ACTIVE' or (account['role']=='REGISTRAR' and not account['officer_verified_at']):
                raise HTTPException(403,'Account approval is required')
            email_changed = str(data.email).lower()!=account['email'].lower()
            phone_changed = data.phone!=re.sub(r'[ ()-]', '', account['phone'] or '')
            contact_changed = email_changed or phone_changed
            if contact_changed and (not data.currentPassword or not passwords.verify(data.currentPassword.get_secret_value(),account['password_hash'])):
                raise HTTPException(401,'Current password is required to change email or phone')
            if user.role=='REGISTRAR' and data.jurisdiction!=account['jurisdiction']:
                raise HTTPException(403,'Registrar jurisdiction changes require operator review')
            profile = {key:getattr(data,key) for key in ('residentialAddress','primaryNomineeName','nomineeRelation','emergencyContact','recoveryGuardian')}
            conn.execute('UPDATE users SET display_name=%s,updated_at=now() WHERE id=%s',(data.name,user.id))
            conn.execute('''UPDATE auth_accounts SET email=%s,phone=%s,jurisdiction=%s,description=%s,profile=%s,
                email_verified_at=CASE WHEN %s THEN NULL ELSE email_verified_at END,
                phone_verified_at=CASE WHEN %s THEN NULL ELSE phone_verified_at END WHERE user_id=%s''',
                (str(data.email).lower(),data.phone if phone_changed else account['phone'],data.jurisdiction,data.description,Jsonb(profile),email_changed,phone_changed,user.id))
            if contact_changed:
                conn.execute('DELETE FROM auth_sessions WHERE user_id=%s',(user.id,))
                conn.execute('UPDATE login_challenges SET consumed=true WHERE user_id=%s',(user.id,))
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409,'Email is already registered') from None
    if contact_changed:
        response.delete_cookie(COOKIE_NAME,path='/api')
    return {'user':public_user(repository.find_user(user.username)), 'login_required':contact_changed}
