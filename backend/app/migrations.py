"""Database schema initialization and migration runner."""
from __future__ import annotations

import logging
from pathlib import Path
import psycopg

logger = logging.getLogger(__name__)

BASE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_reference text UNIQUE NOT NULL,
    display_name text,
    account_status text NOT NULL DEFAULT 'ACTIVE',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;

CREATE TABLE IF NOT EXISTS parcels (
    ulpin text PRIMARY KEY,
    current_owner_user_id uuid REFERENCES users(id),
    survey_number text,
    area_sqm numeric,
    registration_office text,
    ownership_type text,
    title_status text,
    risk_status text,
    frozen boolean DEFAULT false,
    freeze_reason text,
    last_registered_date date,
    transfer_history jsonb NOT NULL DEFAULT '[]',
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS frozen boolean DEFAULT false;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS freeze_reason text;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS title_status text;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS risk_status text;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS transfer_history jsonb NOT NULL DEFAULT '[]';
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS ownerships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id text REFERENCES parcels(ulpin),
    user_id uuid REFERENCES users(id),
    share_bps integer CHECK(share_bps > 0 AND share_bps <= 10000),
    active boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS encumbrances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id text REFERENCES parcels(ulpin),
    status text,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (LIKE encumbrances INCLUDING ALL);
"""


def run_migrations(database_url: str) -> None:
    if not database_url:
        return
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    if not migrations_dir.is_dir():
        migrations_dir = Path("/app/migrations")
    if not migrations_dir.is_dir():
        logger.warning("Migrations directory not found at %s", migrations_dir)
        return

    logger.info("Ensuring database schema and migrations are applied...")
    with psycopg.connect(database_url, autocommit=True) as conn:
        conn.execute(BASE_SCHEMA)
        for migration in sorted(migrations_dir.glob("*.sql")):
            logger.info("Applying migration %s", migration.name)
            conn.execute(migration.read_text())
    logger.info("Database schema and migrations successfully applied.")
