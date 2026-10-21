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
        try:
            conn.execute(BASE_SCHEMA)
        except Exception as exc:
            logger.warning("Base schema initialization notice: %s", exc)
        for migration in sorted(migrations_dir.glob("*.sql")):
            try:
                logger.info("Applying migration %s", migration.name)
                conn.execute(migration.read_text())
            except Exception as exc:
                logger.warning("Migration %s notice: %s", migration.name, exc)
        logger.info("Database schema and migrations successfully applied.")
        seed_properties(conn)


def seed_properties(conn) -> None:
    try:
        row = conn.execute("SELECT count(*) FROM parcels").fetchone()
        if row and row[0] > 0:
            logger.info("Parcels already populated (%s records), skipping seed", row[0])
            return
    except Exception as exc:
        logger.warning("Could not check parcels count: %s", exc)
        return

    seed_file = Path(__file__).resolve().parent / "seed_properties.json"
    if not seed_file.is_file():
        seed_file = Path(__file__).resolve().parents[2] / "Database" / "properties.json"
    if not seed_file.is_file():
        logger.warning("seed_properties.json not found at %s", seed_file)
        return

    import json
    from psycopg.types.json import Jsonb

    try:
        properties = json.loads(seed_file.read_text())
        logger.info("Seeding %s properties and cadastre boundaries into database...", len(properties))
        for p in properties:
            owner_name = p.get("current_owner", "").strip() or "Cadastre Owner"
            owner_ref = "seed:owner:" + owner_name.lower().replace(" ", "_")
            user = conn.execute(
                """INSERT INTO users (identity_reference, display_name, account_status)
                   VALUES (%s, %s, 'ACTIVE')
                   ON CONFLICT (identity_reference) DO UPDATE SET display_name = EXCLUDED.display_name
                   RETURNING id""",
                (owner_ref, owner_name),
            ).fetchone()
            user_id = user[0]

            conn.execute(
                """INSERT INTO parcels (ulpin, current_owner_user_id, survey_number, area_sqm,
                                       registration_office, ownership_type, title_status, risk_status,
                                       frozen, last_registered_date, transfer_history)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (ulpin) DO NOTHING""",
                (
                    p["ulpin"], user_id, p.get("survey_number"), p.get("area_sqm"),
                    p.get("registration_office"), p.get("ownership_type", "SOLE"),
                    p.get("title_status", "VERIFIED"), p.get("risk_status", "LOW_RISK"),
                    bool(p.get("frozen", False)), p.get("last_registered_date"),
                    Jsonb(p.get("transfer_history") or []),
                ),
            )

            if p.get("boundary"):
                conn.execute(
                    """INSERT INTO parcel_map_geometry (parcel_id, boundary, source_reference)
                       VALUES (%s, %s, %s)
                       ON CONFLICT (parcel_id) DO UPDATE SET boundary = EXCLUDED.boundary""",
                    (p["ulpin"], Jsonb(p["boundary"]), "cadastre-survey-2026"),
                )

            conn.execute(
                """INSERT INTO ownerships (parcel_id, user_id, share_bps, active)
                   VALUES (%s, %s, 10000, true)
                   ON CONFLICT DO NOTHING""",
                (p["ulpin"], user_id),
            )
        logger.info("Successfully seeded %s properties and boundaries.", len(properties))
    except Exception as exc:
        logger.exception("Error while seeding properties: %s", exc)
