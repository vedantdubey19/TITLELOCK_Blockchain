"""Login codes delivered by Twilio SMS and Resend; no console-code fallback."""
import base64
import hashlib
import hmac
import json
import re
import secrets
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as URLRequest, urlopen

from fastapi import HTTPException

from .schemas import OTPChallenge


def normalize_phone(value):
    number = re.sub(r'[ ()-]', '', value)
    if re.fullmatch(r'[6-9][0-9]{9}', number):
        number = '+91' + number
    if not re.fullmatch(r'\+91[6-9][0-9]{9}', number):
        raise HTTPException(422, 'Enter a valid Indian mobile number')
    return number


def code_hash(key, challenge_id, channel, code):
    return hmac.new(key.encode(), f'login:{challenge_id}:{channel}:{code}'.encode(), hashlib.sha256).hexdigest()


class Delivery:
    def __init__(self, settings):
        self.settings = settings
        if not all((settings.secret_key, settings.twilio_account_sid, settings.twilio_auth_token.get_secret_value(),
                    settings.twilio_verify_service_sid, settings.resend_api_key.get_secret_value(), settings.otp_email_from)):
            raise HTTPException(503, 'SMS/email OTP delivery is not configured')

    @staticmethod
    def send(request):
        try:
            with urlopen(request, timeout=10) as response:
                return json.loads(response.read())
        except (URLError, TimeoutError):
            # Provider responses may contain destinations or credentials; never echo them.
            raise HTTPException(503, 'OTP delivery failed. Please try signing in again.') from None

    def send_email(self, email, code):
        self.send(URLRequest('https://api.resend.com/emails',
            data=json.dumps({'from': self.settings.otp_email_from, 'to': [email],
                'subject': 'Your TitleLock login code', 'text': f'Your login code is {code}. It expires in 5 minutes.'}).encode(),
            headers={'Authorization': 'Bearer ' + self.settings.resend_api_key.get_secret_value(),
                     'Content-Type': 'application/json', 'User-Agent': 'TitleLock/0.1'}))

    def twilio_request(self, resource, data):
        sid = self.settings.twilio_account_sid
        service = self.settings.twilio_verify_service_sid
        if not re.fullmatch(r'AC[0-9a-fA-F]{32}', sid) or not re.fullmatch(r'VA[0-9a-fA-F]{32}', service):
            raise HTTPException(503, 'Twilio Account SID or Verify Service SID is invalid')
        auth = base64.b64encode(f'{sid}:{self.settings.twilio_auth_token.get_secret_value()}'.encode()).decode()
        request = URLRequest(f'https://verify.twilio.com/v2/Services/{service}/{resource}',
            data=urlencode(data).encode(),
            headers={'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded'})
        try:
            with urlopen(request, timeout=10) as response:
                return json.loads(response.read())
        except HTTPError as error:
            if resource == 'VerificationCheck' and error.code in (400, 404):
                return {'status': 'failed'}
            raise HTTPException(503, 'Twilio Verify could not process the request. Check its Console logs.') from None
        except (URLError, TimeoutError):
            raise HTTPException(503, 'SMS verification is temporarily unavailable') from None

    def send_sms(self, phone):
        result = self.twilio_request('Verifications', {'To': phone, 'Channel': 'sms'})
        if result.get('status') != 'pending' or not re.fullmatch(r'VE[0-9a-fA-F]{32}', result.get('sid', '')):
            raise HTTPException(503, 'Twilio did not start SMS verification')
        return result['sid']

    def verify_sms(self, verification_sid, code):
        return self.twilio_request('VerificationCheck', {'VerificationSid': verification_sid, 'Code': code}).get('status') == 'approved'


def get_delivery(request):
    return Delivery(request.app.state.settings)


def start_challenge(account, request, repository):
    sender = get_delivery(request)
    settings = request.app.state.settings
    if parseaddr(settings.otp_email_from)[1].lower() == 'onboarding@resend.dev':
        if not settings.otp_test_recipient_email or account['email'].lower() != settings.otp_test_recipient_email.lower():
            raise HTTPException(503, 'Resend test mode only supports the configured Resend account email. Verify a domain for other recipients.')
    phone = normalize_phone(account['phone'])
    challenge_id = secrets.token_urlsafe(32)
    email_code = f'{secrets.randbelow(1000000):06d}'
    key = request.app.state.settings.secret_key
    repository.create_challenge(challenge_id, account,
        code_hash(key, challenge_id, 'email', email_code))
    try:
        sender.send_email(account['email'], email_code)
        verification_sid = sender.send_sms(phone)
        repository.mark_challenge_delivered(challenge_id, verification_sid)
    except Exception:
        repository.cancel_challenge(challenge_id)
        raise
    return OTPChallenge(challenge_id=challenge_id,
                        email_hint=account['email'][0] + '***@' + account['email'].split('@')[1],
                        phone_hint='*******' + phone[-4:])
