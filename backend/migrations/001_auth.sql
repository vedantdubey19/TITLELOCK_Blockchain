-- Apply to the restored TitleLock database. Existing identity/parcel rows stay intact.
BEGIN;
CREATE TABLE IF NOT EXISTS auth_accounts (
    user_id uuid PRIMARY KEY REFERENCES users(id),
    email text NOT NULL,
    username text NOT NULL CHECK (username ~ '^[a-zA-Z0-9_.-]{3,64}$'),
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('CITIZEN', 'REGISTRAR')),
    phone text NOT NULL DEFAULT '',
    jurisdiction text NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_email_unique ON auth_accounts (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS auth_username_unique ON auth_accounts (lower(username));
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    key text PRIMARY KEY,
    attempts integer NOT NULL,
    resets_at timestamptz NOT NULL
);
COMMIT;
