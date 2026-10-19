from typing import Literal
from uuid import uuid4
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator, model_validator

PortalRole = Literal['CITIZEN', 'REGISTRAR']


def validate_aadhaar(value):
    if value is not None:
        number = re.sub(r'[ -]', '', value.get_secret_value())
        if not re.fullmatch(r'[2-9][0-9]{11}', number):
            raise ValueError('Aadhaar must contain 12 digits and start with 2–9')
        return SecretStr(number)
    return value


class Signup(BaseModel):
    model_config = ConfigDict(extra='forbid')

    name: str = Field(min_length=1, max_length=120)
    email: EmailStr = Field(max_length=254)
    username: str = Field(default_factory=lambda: 'user_' + uuid4().hex[:16], pattern=r'^[a-zA-Z0-9_.-]{3,64}$')
    password: SecretStr = Field(min_length=8, max_length=128)
    phone: str = Field(default='', max_length=32)
    jurisdiction: str = Field(default='', max_length=200)
    role: PortalRole = 'CITIZEN'
    activeRole: Literal['OWNER', 'REGISTRAR'] | None = None
    description: str = Field(default='', max_length=500)
    registrarCode: SecretStr = SecretStr('')
    aadhaar: SecretStr | None = None
    officerId: SecretStr | None = Field(default=None, min_length=3, max_length=100)

    _aadhaar_format = field_validator('aadhaar')(validate_aadhaar)

    @field_validator('name', 'username', 'phone', 'jurisdiction', 'description', mode='before')
    @classmethod
    def trim_profile_fields(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode='after')
    def validate_role(self):
        if self.role == 'CITIZEN' and self.aadhaar is None:
            raise ValueError('Aadhaar number is required for citizen signup')
        expected = 'REGISTRAR' if self.role == 'REGISTRAR' else 'OWNER'
        if self.activeRole is not None and self.activeRole != expected:
            raise ValueError('activeRole must match the account role')
        return self


class Login(BaseModel):
    model_config = ConfigDict(extra='forbid')

    identifier: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)
    expectedRole: PortalRole | None = None


class User(BaseModel):
    id: str
    name: str
    email: str
    username: str
    phone: str
    jurisdiction: str
    description: str
    role: PortalRole
    status: str
    activeRole: Literal['OWNER', 'REGISTRAR']
    aadhaarLast4: str | None = None
    emailVerified: bool = False
    phoneVerified: bool = False
    officerVerified: bool = False
    profile: dict[str, str] = Field(default_factory=dict)


class AuthResponse(BaseModel):
    success: bool = True
    access_token: str
    token_type: Literal['bearer'] = 'bearer'
    expires_in: int
    user: User


class OTPChallenge(BaseModel):
    otp_required: Literal[True] = True
    challenge_id: str
    expires_in: int = 300
    email_hint: str
    phone_hint: str


class OTPVerification(BaseModel):
    model_config = ConfigDict(extra='forbid')
    challenge_id: str = Field(min_length=32, max_length=100)
    email_code: SecretStr = Field(min_length=6, max_length=6)
    sms_code: SecretStr = Field(min_length=6, max_length=6)

    @field_validator('email_code', 'sms_code')
    @classmethod
    def digits_only(cls, value):
        if not re.fullmatch(r'[0-9]{6}', value.get_secret_value()):
            raise ValueError('Enter a six-digit code')
        return value


class SignupCreated(BaseModel):
    success: Literal[True] = True
    login_required: Literal[True] = True
    message: str = 'Account created. Sign in to verify your email and phone.'


class PendingOfficer(BaseModel):
    pendingApproval: Literal[True] = True
    message: str = 'Your officer account requires administrative identity review before sign-in.'


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr = Field(max_length=254)
    phone: str = Field(max_length=32)
    jurisdiction: str = Field(max_length=200)
    description: str = Field(default='', max_length=500)
    residentialAddress: str = Field(default='', max_length=500)
    primaryNomineeName: str = Field(default='', max_length=120)
    nomineeRelation: str = Field(default='', max_length=80)
    emergencyContact: str = Field(default='', max_length=32)
    recoveryGuardian: str = Field(default='', max_length=120)
    currentPassword: SecretStr | None = Field(default=None, max_length=128)

    @field_validator('name')
    @classmethod
    def trim_name(cls, value):
        if not value.strip():
            raise ValueError('Name cannot be empty')
        return value.strip()
