import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app


def test_health():
    client = TestClient(create_app(Settings(_env_file=None, app_env="testing")))
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "titlelock-api", "env": "testing", "chain_mode": "mock"}


def test_openapi_docs_are_served():
    client = TestClient(create_app(Settings(_env_file=None, app_env="testing")))
    assert client.get("/openapi.json").json()["info"]["title"] == "TitleLock API"


@pytest.mark.parametrize("field, value", [("app_env", "staging"), ("chain_mode", "ethereum")])
def test_invalid_settings_rejected(field, value):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{field: value})


def test_production_requires_secret_key():
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(_env_file=None, app_env="production", secret_key="")
