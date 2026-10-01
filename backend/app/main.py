"""TitleLock API — FastAPI application.

Run locally:  .venv/bin/uvicorn app.main:app --reload --port 5001
Interactive docs: http://127.0.0.1:5001/docs
"""

from __future__ import annotations

from fastapi import FastAPI

from .config import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(
        title="TitleLock API",
        version="0.1.0",
        description="AI-assisted, blockchain-backed land title verification and fraud prevention.",
    )
    app.state.settings = settings

    @app.get("/api/health", tags=["health"])
    def health() -> dict:
        """Liveness check. Database and chain probes are added in Phase 2."""
        return {"status": "ok", "service": "titlelock-api", "env": settings.app_env, "chain_mode": settings.chain_mode}

    return app


app = create_app()
