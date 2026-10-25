"""Small, dependency-free operational checks for the API process."""

from __future__ import annotations

from psycopg import connect

from .chain.service import Registry


def readiness(settings) -> dict[str, str]:
    """Probe dependencies without returning connection strings or provider details."""
    state = {"database": "unconfigured", "blockchain": "not-configured"}
    if settings.database_url:
        try:
            with connect(settings.database_url, connect_timeout=3) as conn:
                conn.execute("SELECT 1").fetchone()
            state["database"] = "ok"
        except Exception:
            state["database"] = "unavailable"
    if settings.chain_mode == "mock":
        state["blockchain"] = "not-required"
    elif settings.chain_contract_address:
        try:
            Registry(settings)
            state["blockchain"] = "ok"
        except Exception:
            state["blockchain"] = "unavailable"
    return state
