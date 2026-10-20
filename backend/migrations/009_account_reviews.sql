BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS officer_identity_unique ON auth_accounts(officer_id_hash) WHERE officer_id_hash IS NOT NULL;
ALTER TABLE identity_link_requests ADD COLUMN IF NOT EXISTS reviewed_by_operator text;
CREATE TABLE IF NOT EXISTS account_review_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED','REVOKED')),
    evidence_reference text NOT NULL,
    operator_name text NOT NULL DEFAULT current_user,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
