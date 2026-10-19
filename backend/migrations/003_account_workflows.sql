BEGIN;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}';
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_id_hash text;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_id_last4 text;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_verified_at timestamptz;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS officer_evidence_reference text;
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS mfa_verified boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS login_challenges (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    email text NOT NULL,
    phone text NOT NULL,
    email_code_hash text NOT NULL,
    twilio_verification_sid text,
    attempts integer NOT NULL DEFAULT 0,
    delivered boolean NOT NULL DEFAULT false,
    consumed boolean NOT NULL DEFAULT false,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_challenges_user_idx ON login_challenges(user_id);
CREATE TABLE IF NOT EXISTS identity_link_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    registry_user_id uuid NOT NULL REFERENCES users(id),
    evidence_reference text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    reviewed_by uuid REFERENCES auth_accounts(user_id),
    review_note text,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS identity_link_pending ON identity_link_requests(account_user_id, registry_user_id) WHERE status='PENDING';
CREATE TABLE IF NOT EXISTS account_identity_links (
    account_user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    registry_user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    request_id uuid NOT NULL UNIQUE REFERENCES identity_link_requests(id),
    PRIMARY KEY(account_user_id, registry_user_id)
);
COMMIT;
