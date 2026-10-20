BEGIN;
CREATE INDEX IF NOT EXISTS sale_document_review_idx ON sale_requests(lower(btrim(document_hash))) WHERE status IN ('PENDING','COMPLETED');
CREATE TABLE IF NOT EXISTS risk_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parcel_id text NOT NULL,
    registrar_user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    buyer_user_id uuid NOT NULL REFERENCES auth_accounts(user_id), document_hash text NOT NULL,
    snapshot_hash text NOT NULL, rules_version integer NOT NULL DEFAULT 1, findings jsonb NOT NULL, score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
    decision text NOT NULL CHECK(decision IN ('CLEAR','BLOCK')),
    consumed_by uuid UNIQUE REFERENCES sale_requests(id),
    expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS risk_parcel_idx ON risk_assessments(parcel_id,created_at DESC);
CREATE TABLE IF NOT EXISTS risk_review_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id uuid NOT NULL REFERENCES risk_assessments(id),
    parcel_id text NOT NULL, opened_by uuid NOT NULL REFERENCES auth_accounts(user_id),
    reason text NOT NULL, evidence_reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    resolved_by uuid REFERENCES auth_accounts(user_id), resolution_reference text, resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS risk_open_hold ON risk_review_holds(parcel_id) WHERE resolved_at IS NULL;
CREATE TABLE IF NOT EXISTS succession_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parcel_id text NOT NULL,
    applicant_user_id uuid NOT NULL REFERENCES auth_accounts(user_id), deceased_user_id uuid NOT NULL REFERENCES users(id),
    heirs jsonb NOT NULL, death_certificate_reference text NOT NULL, legal_heir_reference text NOT NULL,
    document_hash text NOT NULL, ownership_snapshot jsonb NOT NULL,
    status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','IN_REVIEW','EVIDENCE_VERIFIED','REJECTED','WITHDRAWN')),
    assigned_registrar_id uuid REFERENCES auth_accounts(user_id), review_note text,
    created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS succession_active_claim ON succession_cases(parcel_id,deceased_user_id)
    WHERE status IN ('SUBMITTED','IN_REVIEW','EVIDENCE_VERIFIED');
CREATE TABLE IF NOT EXISTS succession_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, case_id uuid NOT NULL REFERENCES succession_cases(id),
    action text NOT NULL, actor_user_id uuid NOT NULL REFERENCES auth_accounts(user_id), note text,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
