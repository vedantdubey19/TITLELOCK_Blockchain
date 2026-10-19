BEGIN;
-- Parcel IDs are validated and locked by the API; the test auth schema has no parcels table.
CREATE TABLE IF NOT EXISTS sale_parcel_state (
    parcel_id text PRIMARY KEY,
    cooldown_until timestamptz
);
CREATE TABLE IF NOT EXISTS sale_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id text NOT NULL REFERENCES sale_parcel_state(parcel_id),
    buyer_user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    registrar_user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    document_hash text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETED','EXPIRED')),
    expires_at timestamptz,
    registrar_key_hash text,
    registrar_approved boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS sale_pending_parcel ON sale_requests(parcel_id) WHERE status='PENDING';
CREATE TABLE IF NOT EXISTS sale_owner_approvals (
    request_id uuid NOT NULL REFERENCES sale_requests(id),
    registry_user_id uuid NOT NULL REFERENCES users(id),
    share_bps integer NOT NULL,
    key_hash text,
    approved_by uuid REFERENCES auth_accounts(user_id),
    approved boolean NOT NULL DEFAULT false,
    PRIMARY KEY(request_id,registry_user_id)
);
COMMIT;
