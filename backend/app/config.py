"""Settings, read from environment variables and backend/.env.

Invalid values fail at startup (pydantic validation), not halfway through a request.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["development", "testing", "production"] = "development"
    secret_key: str = ""
    database_url: str = ""
    chain_mode: Literal["mock", "live"] = "mock"
    chain_rpc_url: str = "http://127.0.0.1:8545"

    @model_validator(mode="after")
    def _production_needs_real_secrets(self) -> "Settings":
        if self.app_env == "production" and self.secret_key in ("", "change-me"):
            raise ValueError("SECRET_KEY must be set to a real secret in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
