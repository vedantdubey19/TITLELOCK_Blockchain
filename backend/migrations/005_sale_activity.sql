BEGIN;
CREATE TABLE IF NOT EXISTS sale_events (
    id bigserial PRIMARY KEY,
    sale_id uuid NOT NULL REFERENCES sale_requests(id),
    actor_user_id uuid REFERENCES auth_accounts(user_id),
    action text NOT NULL CHECK(action IN ('SALE_REQUESTED','OWNER_KEY_ISSUED','REGISTRAR_KEY_ISSUED',
        'OWNER_APPROVED','REGISTRAR_APPROVED','SALE_EXPIRED','TRANSFER_COMPLETED')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS sale_events_timeline ON sale_events(sale_id,id DESC);
CREATE TABLE IF NOT EXISTS sale_notifications (
    event_id bigint NOT NULL REFERENCES sale_events(id),
    user_id uuid NOT NULL REFERENCES auth_accounts(user_id),
    read_at timestamptz,
    PRIMARY KEY(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS sale_notifications_inbox ON sale_notifications(user_id,event_id DESC);
COMMIT;
