BEGIN;
ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS key_exchange_version integer NOT NULL DEFAULT 1;
ALTER TABLE sale_requests ALTER COLUMN key_exchange_version SET DEFAULT 2;
ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS buyer_name text NOT NULL DEFAULT '';
ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS buyer_phone text NOT NULL DEFAULT '';
ALTER TABLE sale_requests ADD COLUMN IF NOT EXISTS registrar_key_issued_at timestamptz;
ALTER TABLE sale_owner_approvals ADD COLUMN IF NOT EXISTS owner_key_received boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS parcel_sale_consents (
    parcel_id text NOT NULL, registry_user_id uuid NOT NULL, for_sale boolean NOT NULL,
    PRIMARY KEY(parcel_id,registry_user_id)
);
CREATE TABLE IF NOT EXISTS parcel_map_geometry (
    parcel_id text PRIMARY KEY, boundary jsonb NOT NULL, source_reference text NOT NULL
);
COMMIT;
