BEGIN;
CREATE TABLE IF NOT EXISTS chain_wallets (
    user_id uuid PRIMARY KEY REFERENCES auth_accounts(user_id),
    address text NOT NULL UNIQUE,
    linked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chain_wallets ADD COLUMN IF NOT EXISTS binding_message jsonb;
ALTER TABLE chain_wallets ADD COLUMN IF NOT EXISTS binding_signature text;
CREATE TABLE IF NOT EXISTS chain_wallet_challenges (
    user_id uuid PRIMARY KEY REFERENCES auth_accounts(user_id),
    address text NOT NULL,
    message jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    consumed boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS chain_baselines (
    parcel_id text PRIMARY KEY,
    chain_id bigint NOT NULL,
    contract_address text NOT NULL,
    state_hash text NOT NULL,
    tx_hash text NOT NULL,
    evidence_reference text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sale_chain_payloads (
    sale_id uuid PRIMARY KEY REFERENCES sale_requests(id),
    typed_data jsonb NOT NULL,
    old_state jsonb NOT NULL,
    new_state jsonb NOT NULL,
    signatures jsonb NOT NULL DEFAULT '{}',
    state text NOT NULL DEFAULT 'SIGNING' CHECK(state IN ('SIGNING','PREPARED','SUBMITTED','CONFIRMED','EXPIRED','REVIEW')),
    tx_hash text,
    block_number bigint,
    confirmed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sale_events DROP CONSTRAINT IF EXISTS sale_events_action_check;
ALTER TABLE sale_events ADD CONSTRAINT sale_events_action_check CHECK(action IN (
    'SALE_REQUESTED','OWNER_KEY_ISSUED','REGISTRAR_KEY_ISSUED','OWNER_APPROVED','REGISTRAR_APPROVED',
    'SALE_EXPIRED','TRANSFER_COMPLETED','TRANSFER_FAILED','WALLET_APPROVED','BLOCKCHAIN_PREPARED'));
COMMIT;
