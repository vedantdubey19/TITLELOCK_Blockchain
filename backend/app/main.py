"""TitleLock API — FastAPI application.

Run locally:  .venv/bin/uvicorn app.main:app --reload --port 5001
Interactive docs: http://127.0.0.1:5001/docs
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
import logging
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
import psycopg
from psycopg import OperationalError
from psycopg.errors import UndefinedTable

from .config import Settings, get_settings
from .auth.routes import router as auth_router
from .parcels.routes import router as parcels_router
from .transfers.sales import router as sales_router, expire_sales
from .auth.repository import AuthRepository
from .audit.sales import router as activity_router
from .chain.routes import router as chain_router
from .chain.settlement import reconcile_pending
from .fraud.routes import router as risk_router
from .transfers.succession import router as succession_router
from .observability import readiness
from .migrations import run_migrations


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    @asynccontextmanager
    async def lifespan(app):
        if settings.database_url:
            try:
                await asyncio.to_thread(run_migrations, settings.database_url)
                app.state.migration_status = "ok"
            except Exception as e:
                app.state.migration_status = f"failed: {type(e).__name__}: {e}"
                logging.getLogger(__name__).exception("Database schema bootstrap / migration failed on startup")

        async def expiry_worker():
            while True:
                if settings.database_url:
                    try:
                        await asyncio.to_thread(reconcile_pending, AuthRepository(settings.database_url), settings)
                    except Exception:
                        logging.getLogger(__name__).warning("Chain reconciliation unavailable; prepared deals stay reserved")
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
        description="Blockchain-backed land title verification and rule-based risk screening.",
        docs_url=None if settings.app_env == 'production' else '/docs',
        redoc_url=None if settings.app_env == 'production' else '/redoc',
        openapi_url=None if settings.app_env == 'production' else '/openapi.json',
    )
    app.add_middleware(CORSMiddleware, allow_origins=settings.frontend_origins, allow_credentials=True,
                       allow_methods=['GET', 'POST', 'PATCH'], allow_headers=['Content-Type', 'Authorization'])
    if settings.app_env == 'production':
        app.add_middleware(HTTPSRedirectMiddleware)
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts, www_redirect=False)

    @app.middleware('http')
    async def response_security(request, call_next):
        request_id = request.headers.get('X-Request-ID') or uuid.uuid4().hex
        try:
            response = await call_next(request)
        except Exception as failure:
            # Do not log bodies, headers, database URLs, keys, or provider responses.
            logging.getLogger(__name__).exception('Unhandled API error id=%s method=%s path=%s type=%s',
                                                  request_id, request.method, request.url.path, type(failure).__name__)
            response = JSONResponse(status_code=500, content={'detail': 'Internal server error', 'request_id': request_id})
        response.headers['X-Request-ID'] = request_id
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'no-referrer'
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        if settings.app_env == 'production' and request.url.scheme == 'https':
            response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        return response

    app.state.settings = settings
    app.include_router(auth_router)
    app.include_router(parcels_router)
    app.include_router(sales_router)
    app.include_router(activity_router)
    app.include_router(chain_router)
    app.include_router(risk_router)
    app.include_router(succession_router)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # FastAPI's default validation response echoes input, including passwords.
        errors = [{key: value for key, value in error.items() if key not in {'input', 'ctx'}}
                  for error in exc.errors()]
        return JSONResponse(status_code=422, content={'detail': errors})

    @app.exception_handler(psycopg.Error)
    @app.exception_handler(OperationalError)
    @app.exception_handler(UndefinedTable)
    async def database_unavailable(request, exc):
        logging.getLogger(__name__).error("Database error on %s %s: %s", request.method, request.url.path, exc)
        return JSONResponse(status_code=503, content={"detail": f"{type(exc).__name__}: {exc}"})

    @app.get("/api/health", tags=["health"])
    def health() -> dict:
        """Liveness check. Database and chain probes are added in Phase 2."""
        return {"status": "ok", "service": "titlelock-api", "env": settings.app_env, "chain_mode": settings.chain_mode, "chain_id": settings.chain_id, "chain_contract": settings.chain_contract_address}

    @app.get('/api/readiness', tags=['health'])
    def ready():
        """Dependency readiness for a private load balancer or uptime monitor."""
        dependencies = readiness(settings)
        status = 'ready' if all(value in ('ok', 'not-required') for value in dependencies.values()) else 'degraded'
        return JSONResponse(status_code=200 if status == 'ready' else 503,
                            content={'status': status, 'service': 'titlelock-api', 'dependencies': dependencies})

    dist = Path(settings.frontend_dist)
    if settings.frontend_dist and dist.is_dir():
        @app.get('/{path:path}', include_in_schema=False)
        def frontend(path: str):
            if path.startswith('api/'):
                raise HTTPException(404, 'Not found')
            candidate = (dist / path).resolve()
            if candidate.is_relative_to(dist.resolve()) and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(dist / 'index.html')

    return app


app = create_app()
