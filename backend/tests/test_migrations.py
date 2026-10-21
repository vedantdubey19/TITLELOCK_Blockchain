import psycopg
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app


def test_psycopg_error_returns_503_instead_of_500():
    settings = Settings(_env_file=None, app_env="testing", secret_key="a" * 32, sale_token_secret="b" * 32)
    app = create_app(settings)

    @app.get("/test/psycopg-error")
    def trigger_psycopg_error():
        raise psycopg.Error("Simulated relation or column error")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test/psycopg-error")
    assert response.status_code == 503
    assert "Database error" in response.json()["detail"]
