"""TitleLock API — FastAPI application.

Run locally:  .venv/bin/uvicorn app.main:app --reload --port 5001
Interactive docs: http://127.0.0.1:5001/docs
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from psycopg import OperationalError
from psycopg.errors import UndefinedTable

from .config import Settings, get_settings
from .auth.routes import router as auth_router
from .parcels.routes import router as parcels_router
from .transfers.sales import router as sales_router, expire_sales
from .auth.repository import AuthRepository
from .audit.sales import router as activity_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    @asynccontextmanager
    async def lifespan(app):
        async def expiry_worker():
            while True:
                if settings.database_url:
                    try:
                        await asyncio.to_thread(expire_sales, AuthRepository(settings.database_url))
                    except Exception:
                        logging.getLogger(__name__).warning("Sale expiry sweep unavailable; request-time checks remain enabled")
                await asyncio.sleep(30)
        task = asyncio.create_task(expiry_worker())
        try:
            yield
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    app = FastAPI(
        lifespan=lifespan,
        title="TitleLock API",
        version="0.1.0",
        description="AI-assisted, blockchain-backed land title verification and fraud prevention.",
    )
    app.state.settings = settings
    app.include_router(auth_router)
    app.include_router(parcels_router)
    app.include_router(sales_router)
    app.include_router(activity_router)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # FastAPI's default validation response echoes input, including passwords.
        errors = [{key: value for key, value in error.items() if key not in {'input', 'ctx'}}
                  for error in exc.errors()]
        return JSONResponse(status_code=422, content={'detail': errors})

    @app.exception_handler(OperationalError)
    @app.exception_handler(UndefinedTable)
    async def database_unavailable(request, exc):
        return JSONResponse(status_code=503, content={"detail": "Database unavailable or authentication migration not applied"})

    @app.get("/api/health", tags=["health"])
    def health() -> dict:
        """Liveness check. Database and chain probes are added in Phase 2."""
        return {"status": "ok", "service": "titlelock-api", "env": settings.app_env, "chain_mode": settings.chain_mode}

    return app


app = create_app()
