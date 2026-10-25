import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.main import create_app


def test_health():
    client = TestClient(create_app(Settings(_env_file=None, app_env="testing")))
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "titlelock-api", "env": "testing", "chain_mode": "mock", "chain_id": 31337, "chain_contract": ""}


def test_readiness_reports_dependency_state_without_configuration(monkeypatch):
    monkeypatch.setattr('app.main.readiness', lambda settings: {'database': 'ok', 'blockchain': 'not-required'})
    client = TestClient(create_app(Settings(_env_file=None, app_env='testing')))
    response = client.get('/api/readiness')
    assert response.status_code == 200
    assert response.json()['status'] == 'ready'
    assert response.json()['dependencies'] == {'database': 'ok', 'blockchain': 'not-required'}


def test_readiness_fails_closed_when_database_or_chain_is_unavailable(monkeypatch):
    monkeypatch.setattr('app.main.readiness', lambda settings: {'database': 'unavailable', 'blockchain': 'unavailable'})
    client = TestClient(create_app(Settings(_env_file=None, app_env='testing')))
    response = client.get('/api/readiness')
    assert response.status_code == 503
    assert response.json()['dependencies'] == {'database': 'unavailable', 'blockchain': 'unavailable'}


def test_unhandled_errors_return_only_a_safe_request_id():
    app = create_app(Settings(_env_file=None, app_env='testing'))

    @app.get('/test/failure')
    def failure():
        raise RuntimeError('password=should-never-be-returned')

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get('/test/failure')
    assert response.status_code == 500
    assert response.json()['detail'] == 'Internal server error'
    assert response.json()['request_id'] == response.headers['x-request-id']


def test_combined_host_serves_spa_but_never_falls_back_for_unknown_api(tmp_path):
    dist=tmp_path/'dist'; dist.mkdir()
    (dist/'index.html').write_text('<main>TitleLock</main>')
    (dist/'asset.js').write_text('console.log("asset")')
    client=TestClient(create_app(Settings(_env_file=None, app_env='testing', frontend_dist=str(dist))))
    assert client.get('/citizen/dashboard').text == '<main>TitleLock</main>'
    assert client.get('/asset.js').text == 'console.log("asset")'
    assert client.get('/api/not-a-route').status_code == 404


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
