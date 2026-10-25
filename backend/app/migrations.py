"""Database schema initialization, migration, and data seed runner."""
from __future__ import annotations

import logging
from pathlib import Path
import psycopg

logger = logging.getLogger(__name__)

BASE_SCHEMA_TABLES = [
    """CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        identity_reference text UNIQUE NOT NULL,
        display_name text,
        account_status text NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS parcels (
        ulpin text PRIMARY KEY,
        current_owner_user_id uuid,
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
    )""",
    """CREATE TABLE IF NOT EXISTS ownerships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id text,
        user_id uuid,
        share_bps integer CHECK(share_bps > 0 AND share_bps <= 10000),
        active boolean NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS encumbrances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id text,
        status text,
        details jsonb,
        created_at timestamptz DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS disputes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id text,
        status text,
        details jsonb,
        created_at timestamptz DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS parcel_map_geometry (
        parcel_id text PRIMARY KEY,
        boundary jsonb NOT NULL,
        source_reference text NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS parcel_sale_consents (
        parcel_id text NOT NULL,
        registry_user_id uuid NOT NULL,
        for_sale boolean NOT NULL,
        PRIMARY KEY(parcel_id, registry_user_id)
    )""",
    """CREATE TABLE IF NOT EXISTS sale_parcel_state (
        parcel_id text PRIMARY KEY,
        cooldown_until timestamptz
    )""",
    """CREATE TABLE IF NOT EXISTS sale_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id text NOT NULL,
        buyer_user_id uuid NOT NULL,
        registrar_user_id uuid NOT NULL,
        document_hash text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETED','EXPIRED')),
        expires_at timestamptz,
        registrar_key_hash text,
        registrar_approved boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        key_exchange_version integer NOT NULL DEFAULT 2,
        buyer_name text NOT NULL DEFAULT '',
        buyer_phone text NOT NULL DEFAULT '',
        registrar_key_issued_at timestamptz
    )""",
    """CREATE TABLE IF NOT EXISTS sale_owner_approvals (
        request_id uuid NOT NULL,
        registry_user_id uuid NOT NULL,
        share_bps integer NOT NULL,
        key_hash text,
        approved_by uuid,
        approved boolean NOT NULL DEFAULT false,
        owner_key_received boolean NOT NULL DEFAULT false,
        PRIMARY KEY(request_id, registry_user_id)
    )""",
    """CREATE TABLE IF NOT EXISTS sale_events (
        id bigserial PRIMARY KEY,
        sale_id uuid NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        reason text,
        created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )""",
    """CREATE TABLE IF NOT EXISTS sale_notifications (
        event_id bigint NOT NULL,
        user_id uuid NOT NULL,
        read_at timestamptz,
        PRIMARY KEY(event_id, user_id)
    )""",
    """CREATE TABLE IF NOT EXISTS sale_chain_payloads (
        sale_id uuid PRIMARY KEY,
        typed_data jsonb NOT NULL,
        old_state jsonb NOT NULL,
        new_state jsonb NOT NULL,
        signatures jsonb NOT NULL DEFAULT '{}',
        state text NOT NULL DEFAULT 'SIGNING',
        tx_hash text,
        block_number bigint,
        confirmed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS risk_assessments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id text NOT NULL,
        registrar_user_id uuid NOT NULL,
        buyer_user_id uuid NOT NULL,
        document_hash text NOT NULL,
        snapshot_hash text NOT NULL,
        rules_version integer NOT NULL DEFAULT 1,
        findings jsonb NOT NULL,
        score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
        decision text NOT NULL CHECK(decision IN ('CLEAR','BLOCK')),
        consumed_by uuid UNIQUE,
        expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS risk_review_holds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id uuid NOT NULL,
        parcel_id text NOT NULL,
        opened_by uuid NOT NULL,
        reason text NOT NULL,
        evidence_reference text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        resolved_by uuid,
        resolution_reference text,
        resolved_at timestamptz
    )""",
    """CREATE TABLE IF NOT EXISTS succession_cases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id text NOT NULL,
        applicant_user_id uuid NOT NULL,
        deceased_user_id uuid NOT NULL,
        heirs jsonb NOT NULL,
        death_certificate_reference text NOT NULL,
        legal_heir_reference text NOT NULL,
        document_hash text NOT NULL,
        ownership_snapshot jsonb NOT NULL,
        status text NOT NULL DEFAULT 'SUBMITTED',
        assigned_registrar_id uuid,
        review_note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        reviewed_at timestamptz
    )""",
    """CREATE TABLE IF NOT EXISTS succession_events (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        case_id uuid NOT NULL,
        action text NOT NULL,
        actor_user_id uuid NOT NULL,
        note text,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS auth_accounts (
        user_id uuid PRIMARY KEY,
        email text NOT NULL,
        username text NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL,
        phone text NOT NULL DEFAULT '',
        jurisdiction text NOT NULL DEFAULT '',
        description text NOT NULL DEFAULT '',
        aadhaar_hash text,
        aadhaar_last4 text,
        profile jsonb NOT NULL DEFAULT '{}',
        email_verified_at timestamptz,
        phone_verified_at timestamptz,
        officer_id_hash text,
        officer_id_last4 text,
        officer_verified_at timestamptz,
        officer_evidence_reference text,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash text PRIMARY KEY,
        user_id uuid NOT NULL,
        expires_at timestamptz NOT NULL,
        mfa_verified boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS auth_rate_limits (
        key text PRIMARY KEY,
        attempts integer NOT NULL,
        resets_at timestamptz NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS login_challenges (
        id text PRIMARY KEY,
        user_id uuid NOT NULL,
        email text NOT NULL,
        phone text NOT NULL,
        email_code_hash text NOT NULL,
        twilio_verification_sid text,
        attempts integer NOT NULL DEFAULT 0,
        delivered boolean NOT NULL DEFAULT false,
        consumed boolean NOT NULL DEFAULT false,
        expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS identity_link_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        account_user_id uuid NOT NULL,
        registry_user_id uuid NOT NULL,
        evidence_reference text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
        reviewed_by uuid,
        review_note text,
        reviewed_by_operator text,
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS account_identity_links (
        account_user_id uuid NOT NULL,
        registry_user_id uuid NOT NULL,
        request_id uuid NOT NULL,
        PRIMARY KEY(account_user_id, registry_user_id)
    )""",
    """CREATE TABLE IF NOT EXISTS chain_wallets (
        user_id uuid PRIMARY KEY,
        address text NOT NULL UNIQUE,
        linked_at timestamptz NOT NULL DEFAULT now(),
        binding_message jsonb,
        binding_signature text
    )""",
    """CREATE TABLE IF NOT EXISTS chain_wallet_challenges (
        user_id uuid PRIMARY KEY,
        address text NOT NULL,
        message jsonb NOT NULL,
        expires_at timestamptz NOT NULL,
        consumed boolean NOT NULL DEFAULT false
    )""",
    """CREATE TABLE IF NOT EXISTS chain_baselines (
        parcel_id text PRIMARY KEY,
        chain_id bigint NOT NULL,
        contract_address text NOT NULL,
        state_hash text NOT NULL,
        tx_hash text NOT NULL,
        evidence_reference text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE IF NOT EXISTS chain_baseline_revisions (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        parcel_id text NOT NULL,
        chain_id bigint NOT NULL,
        contract_address text NOT NULL,
        state_hash text NOT NULL,
        tx_hash text NOT NULL,
        evidence_reference text NOT NULL,
        replaced_at timestamptz NOT NULL DEFAULT now(),
        replacement_contract_address text NOT NULL,
        replacement_tx_hash text NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS account_review_events (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        account_user_id uuid NOT NULL,
        decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED','REVOKED')),
        evidence_reference text NOT NULL,
        operator_name text NOT NULL DEFAULT current_user,
        created_at timestamptz NOT NULL DEFAULT now()
    )"""
]

SAFE_ALTERS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'ACTIVE'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text",
    "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS frozen boolean DEFAULT false",
    "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS freeze_reason text",
    "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS title_status text",
    "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS risk_status text",
    "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS transfer_history jsonb NOT NULL DEFAULT '[]'",
    "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS aadhaar_hash text",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS aadhaar_last4 text",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}'",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_id_hash text",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_id_last4 text",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_verified_at timestamptz",
    "ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_evidence_reference text",
    "ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false",
    "ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS key_exchange_version integer NOT NULL DEFAULT 2",
    "ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS buyer_name text NOT NULL DEFAULT ''",
    "ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS buyer_phone text NOT NULL DEFAULT ''",
    "ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS registrar_key_issued_at timestamptz",
    "ALTER TABLE sale_owner_approvals ADD COLUMN IF NOT EXISTS owner_key_received boolean NOT NULL DEFAULT false",
    "ALTER TABLE sale_events ADD COLUMN IF NOT EXISTS reason text",
    "ALTER TABLE chain_wallets ADD COLUMN IF NOT EXISTS binding_message jsonb",
    "ALTER TABLE chain_wallets ADD COLUMN IF NOT EXISTS binding_signature text",
    "ALTER TABLE identity_link_requests ADD COLUMN IF NOT EXISTS reviewed_by_operator text",
    "ALTER TABLE chain_wallet_challenges ADD PRIMARY KEY (user_id)",
]

BASE_SCHEMA_INDEXES = [
    "CREATE UNIQUE INDEX IF NOT EXISTS chain_wallet_challenges_user_idx ON chain_wallet_challenges(user_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS auth_email_unique ON auth_accounts (lower(email))",
    "CREATE UNIQUE INDEX IF NOT EXISTS auth_username_unique ON auth_accounts (lower(username))",
    "CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id)",
    "CREATE INDEX IF NOT EXISTS login_challenges_user_idx ON login_challenges(user_id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS identity_link_pending ON identity_link_requests(account_user_id, registry_user_id) WHERE status='PENDING'",
    "CREATE UNIQUE INDEX IF NOT EXISTS sale_pending_parcel ON sale_requests(parcel_id) WHERE status='PENDING'",
    "CREATE INDEX IF NOT EXISTS sale_events_timeline ON sale_events(sale_id, id DESC)",
    "CREATE INDEX IF NOT EXISTS sale_notifications_inbox ON sale_notifications(user_id, event_id DESC)",
    "CREATE UNIQUE INDEX IF NOT EXISTS officer_identity_unique ON auth_accounts(officer_id_hash) WHERE officer_id_hash IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS sale_document_review_idx ON sale_requests(lower(btrim(document_hash))) WHERE status IN ('PENDING','COMPLETED')",
    "CREATE INDEX IF NOT EXISTS risk_parcel_idx ON risk_assessments(parcel_id, created_at DESC)",
    "CREATE UNIQUE INDEX IF NOT EXISTS risk_open_hold ON risk_review_holds(parcel_id) WHERE resolved_at IS NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS succession_active_claim ON succession_cases(parcel_id, deceased_user_id) WHERE status IN ('SUBMITTED','IN_REVIEW','EVIDENCE_VERIFIED')",
]


def run_migrations(database_url: str) -> None:
    if not database_url:
        return
    migrations_dir = Path(__file__).resolve().parent.parent / "migrations"
    if not migrations_dir.is_dir():
        migrations_dir = Path("/app/migrations")

    logger.info("Ensuring database schema and migrations are applied...")
    with psycopg.connect(database_url, autocommit=True) as conn:
        for stmt in BASE_SCHEMA_TABLES:
            try:
                conn.execute(stmt)
            except Exception as exc:
                logger.debug("Table creation notice: %s", exc)

        for stmt in SAFE_ALTERS:
            try:
                conn.execute(stmt)
            except Exception as exc:
                logger.debug("Safe alter notice: %s", exc)

        for stmt in BASE_SCHEMA_INDEXES:
            try:
                conn.execute(stmt)
            except Exception as exc:
                logger.debug("Index creation notice: %s", exc)

        if migrations_dir.is_dir():
            for migration in sorted(migrations_dir.glob("*.sql")):
                try:
                    logger.info("Applying migration %s", migration.name)
                    conn.execute(migration.read_text())
                except Exception as exc:
                    logger.warning("Migration %s notice: %s", migration.name, exc)

        logger.info("Database schema applied.")
    seed_properties(database_url)


def seed_properties(database_url: str) -> None:
    if not database_url:
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
        logger.info("Checking if properties need to be seeded into database...")
        with psycopg.connect(database_url, autocommit=True) as conn:
            row = conn.execute("SELECT count(*) FROM parcels").fetchone()
            if row and row[0] >= 100:
                logger.info("Parcels already populated (%s records), checking geometries...", row[0])
                geom_row = conn.execute("SELECT count(*) FROM parcel_map_geometry").fetchone()
                if geom_row and geom_row[0] >= 100:
                    logger.info("Geometries already populated (%s records), skipping seed", geom_row[0])
                    return

            logger.info("Seeding %s properties and cadastre boundaries into database...", len(properties))
            for p in properties:
                try:
                    owner_name = p.get("current_owner", "").strip() or "Cadastre Owner"
                    owner_ref = "seed:owner:" + owner_name.lower().replace(" ", "_")

                    user = conn.execute("SELECT id FROM users WHERE identity_reference = %s", (owner_ref,)).fetchone()
                    if not user:
                        user = conn.execute(
                            "INSERT INTO users (identity_reference, display_name, account_status) VALUES (%s, %s, 'ACTIVE') RETURNING id",
                            (owner_ref, owner_name),
                        ).fetchone()
                    user_id = user[0]

                    parcel = conn.execute("SELECT ulpin FROM parcels WHERE ulpin = %s", (p["ulpin"],)).fetchone()
                    if not parcel:
                        conn.execute(
                            """INSERT INTO parcels (ulpin, current_owner_user_id, survey_number, area_sqm,
                                                   registration_office, ownership_type, title_status, risk_status,
                                                   frozen, last_registered_date, transfer_history)
                               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                            (
                                p["ulpin"], user_id, p.get("survey_number"), p.get("area_sqm"),
                                p.get("registration_office"), p.get("ownership_type", "SOLE"),
                                p.get("title_status", "VERIFIED"), p.get("risk_status", "LOW_RISK"),
                                bool(p.get("frozen", False)), p.get("last_registered_date"),
                                Jsonb(p.get("transfer_history") or []),
                            ),
                        )

                    if p.get("boundary"):
                        geom = conn.execute("SELECT parcel_id FROM parcel_map_geometry WHERE parcel_id = %s", (p["ulpin"],)).fetchone()
                        if not geom:
                            conn.execute(
                                """INSERT INTO parcel_map_geometry (parcel_id, boundary, source_reference)
                                   VALUES (%s, %s, %s)""",
                                (p["ulpin"], Jsonb(p["boundary"]), "cadastre-survey-2026"),
                            )

                    ownership = conn.execute("SELECT 1 FROM ownerships WHERE parcel_id = %s AND user_id = %s", (p["ulpin"], user_id)).fetchone()
                    if not ownership:
                        conn.execute(
                            """INSERT INTO ownerships (parcel_id, user_id, share_bps, active)
                               VALUES (%s, %s, 10000, true)""",
                            (p["ulpin"], user_id),
                        )
                except Exception as item_err:
                    logger.warning("Error seeding property %s: %s", p.get("ulpin"), item_err)
            logger.info("Completed property seed check.")
    except Exception as exc:
        logger.exception("Error in seed_properties: %s", exc)
