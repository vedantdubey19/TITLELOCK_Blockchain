"""Settings, read from environment variables and backend/.env.

Invalid values fail at startup (pydantic validation), not halfway through a request.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit
import re
import ipaddress

from psycopg.conninfo import conninfo_to_dict

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True)

    app_env: Literal["development", "testing", "production"] = "development"
    secret_key: str = Field(default="", repr=False)
    database_url: str = Field(default="", repr=False)
    session_ttl_hours: int = Field(default=24, ge=1, le=168)
    registrar_signup_code: SecretStr = SecretStr("")
    frontend_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']
    trusted_hosts: list[str] = []
    sale_token_secret: SecretStr = SecretStr('')
    login_otp_enabled: bool = False
    twilio_account_sid: str = ''
    twilio_auth_token: SecretStr = SecretStr('')
    twilio_verify_service_sid: str = ''
    resend_api_key: SecretStr = SecretStr('')
    otp_email_from: str = ''
    otp_test_recipient_email: str = ''
    chain_mode: Literal["mock", "live"] = "mock"
    chain_id: int = 31337
    chain_contract_address: str = ''
    chain_confirmations: int = Field(default=1, ge=1, le=128)
    chain_logs_rpc_url: str = Field(default='', repr=False)
    chain_log_block_range: int = Field(default=10000, ge=1, le=50000)
    chain_deployment_block: int = Field(default=0, ge=0)
    chain_rpc_url: str = Field(default="http://127.0.0.1:8545", repr=False)
    frontend_dist: str = ''

    @model_validator(mode="after")
    def _production_needs_real_secrets(self) -> "Settings":
        if self.app_env == "production":
            values = [('SECRET_KEY', self.secret_key), ('SALE_TOKEN_SECRET', self.sale_token_secret.get_secret_value())]
            if self.registrar_signup_code.get_secret_value():
                values.append(('REGISTRAR_SIGNUP_CODE', self.registrar_signup_code.get_secret_value()))
            for name, value in values:
                if len(value) < 32 or len(set(value)) < 8:
                    raise ValueError(f'{name} must be independently generated with at least 32 random characters')
            if len({value for _, value in values}) != len(values):
                raise ValueError('Production secrets must be independent')
            if not self.trusted_hosts or any(not re.fullmatch(r'[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?', host)
                                             or '.' not in host or host.lower().endswith(('.localhost', '.local')) for host in self.trusted_hosts):
                raise ValueError('TRUSTED_HOSTS must contain explicit public hostnames without schemes, ports or wildcards')
            for host in self.trusted_hosts:
                try:
                    ipaddress.ip_address(host)
                except ValueError:
                    continue
                raise ValueError('TRUSTED_HOSTS must use public DNS hostnames, not IP addresses')
            if not self.frontend_origins:
                raise ValueError('FRONTEND_ORIGINS must explicitly list the HTTPS website origins')
            for origin in self.frontend_origins:
                url = urlsplit(origin)
                if url.scheme != 'https' or url.hostname not in self.trusted_hosts or url.username or url.password or url.path or url.query or url.fragment:
                    raise ValueError('FRONTEND_ORIGINS must be HTTPS origins on TRUSTED_HOSTS, with no path or credentials')
            try:
                database = conninfo_to_dict(self.database_url)
            except Exception:
                raise ValueError('DATABASE_URL must be a valid PostgreSQL connection string') from None
            if not database.get('dbname') or not database.get('host') or not database.get('user') or database['user'].lower() in ('postgres', 'root'):
                raise ValueError('DATABASE_URL must specify a dedicated database host, name and non-admin application user')
            if any(word in (database.get('dbname', '') + ' ' + database.get('options', '')).lower() for word in ('demo', 'test', 'anvil')):
                raise ValueError('Production cannot use a demo or test database/schema')
            if database.get('sslmode') != 'verify-full':
                raise ValueError('Production DATABASE_URL requires sslmode=verify-full and a trusted database CA')
            if self.chain_mode != 'live' or self.chain_id != 11155111 or not re.fullmatch(r'0x[0-9a-fA-F]{40}', self.chain_contract_address) or int(self.chain_contract_address,16) == 0:
                raise ValueError('Production requires the deployed Sepolia contract with CHAIN_MODE=live')
            if self.otp_test_recipient_email:
                raise ValueError('OTP_TEST_RECIPIENT_EMAIL is forbidden in production')
            if self.login_otp_enabled and not all((self.twilio_account_sid, self.twilio_auth_token.get_secret_value(), self.twilio_verify_service_sid,
                                                 self.resend_api_key.get_secret_value(), self.otp_email_from)):
                raise ValueError('Enabled login OTP requires complete provider configuration')
        if self.chain_id not in (31337, 11155111):
            raise ValueError("Only local Anvil and Sepolia test networks are supported")
        if self.chain_id == 11155111:
            if self.chain_contract_address and self.chain_deployment_block == 0:
                raise ValueError('A deployed Sepolia contract requires CHAIN_DEPLOYMENT_BLOCK > 0')
            if self.chain_confirmations < 3:
                raise ValueError("Sepolia requires at least 3 confirmations")
            if self.chain_logs_rpc_url and not self.chain_logs_rpc_url.startswith('https://'):
                raise ValueError('Sepolia log RPC must use HTTPS')
            if not self.chain_rpc_url.startswith("https://"):
                raise ValueError("Sepolia requires an HTTPS RPC URL")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
