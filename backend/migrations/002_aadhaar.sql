BEGIN;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS aadhaar_hash text;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS aadhaar_last4 text;
COMMIT;
