# Authentication backend

FastAPI + Pydantic validate requests, `pwdlib` hashes passwords with Argon2id,
and psycopg stores accounts and sessions in PostgreSQL. Sessions use random
bearer tokens; only SHA-256 token hashes are stored. Logout deletes the current
session and every protected request checks expiry, account status, and role.

## Setup

The local workspace is configured with PostgreSQL 18 on `127.0.0.1:5433`,
database `TitleLock_db`, and application role `titlelock_app`. Credentials are
stored only in the git-ignored, owner-readable `backend/.env`. The existing
server on port 5432 is separate. Homebrew starts this instance at login:
`brew services start postgresql@18`. The supplied backup and authentication
migration have been applied locally. `titlelock_auth_test` is the separate
database for integration tests.

For a fresh machine:

Restore `Database/TitleLock_db_backup.sql` with `pg_restore` first (it is a custom
dump, despite the extension). Set `DATABASE_URL` in `backend/.env`, then from
`backend/` run:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/001_auth.sql
.venv/bin/uvicorn app.main:app --reload --port 5001
```

`psql` needs the URL exported in your shell; `.env` is read by the application,
not by `psql`. Alternatively run the migration in your PostgreSQL SQL editor.
The migration adds `auth_accounts`, `auth_sessions`, and `auth_rate_limits`.
It does not modify existing users, ownerships, or parcel records.

Also apply `migrations/002_aadhaar.sql` after `001_auth.sql`. It adds nullable
`aadhaar_hash` and `aadhaar_last4` fields without replacing existing accounts.
Both migrations have been applied to this workspace's local database.

Citizen signup requires an `aadhaar` string (12 digits, starting
with 2–9; spaces/hyphens are normalized). This is a self-declared number matched
to the account, not UIDAI verification. No Aadhaar OTP or UIDAI request is sent.
Registrars continue using their existing login and authorization-code flow.
Do not use real Aadhaar numbers for development tests.

Only a purpose-separated HMAC-SHA256 digest and the last four digits are stored.
`SECRET_KEY` must be set and kept private/stable; changing it without a migration
will prevent matching existing Aadhaar digests. Neither Aadhaar nor its digest
is returned in authentication responses or stored in browser storage.

Login requires only email/username and password. Aadhaar is not accepted as a
login credential, and existing accounts without Aadhaar can continue signing in.
No Aadhaar enrollment or changes take place during login.

`SESSION_TTL_HOURS` defaults to 24. `REGISTRAR_SIGNUP_CODE` defaults to empty,
which disables registrar registration. To enable it, set a private random
value and share it only with authorized staff. Never use the public frontend
demo code. This is a shared enrollment secret, not government identity proof.

## API contract

| Method | Endpoint | Request / result |
|---|---|---|
| POST | `/api/auth/signup` | `name`, `email`, `password`; optional `username`, `phone`, `jurisdiction`, `description`, `role`, `activeRole`, `registrarCode` |
| POST | `/api/auth/login` | `identifier` (email or username), `password`, optional `expectedRole` (`CITIZEN` or `REGISTRAR`) |
| GET | `/api/auth/me` | Current user; requires bearer token |
| POST | `/api/auth/logout` | Revokes current token; returns 204 |

Signup and login return `{success, access_token, token_type, expires_in, user}`.
`user` includes `id`, `name`, `email`, `username`, `phone`, `jurisdiction`,
`description`, `role`, `status`, and derived `activeRole`. Passwords, password
hashes, and enrollment codes are never included. A missing username is generated
and returned; email login always works. Passwords require 8–128 characters.

The frontend uses an HTTP-only `titlelock_session` cookie, set on signup/login
and deleted on logout. It is scoped to `/api`, uses `SameSite=Strict`, and is
`Secure` in production. Signup/login/logout validate browser request origins;
configure `FRONTEND_ORIGINS` for your deployment. The Vite `/api` proxy keeps
frontend requests on the same origin. Account and token data are not stored in
localStorage; `/me` restores the current user after refresh. The HTTP-only
cookie contains the opaque session token; account/session records live in PostgreSQL.

API clients and Swagger can still send `Authorization: Bearer <access_token>`. Future citizen
routes use `Depends(require_role('CITIZEN'))`; registrar routes use
`Depends(require_role('REGISTRAR'))` from `app.auth.routes`. Parcel ownership and
nominee/buyer permissions must additionally check database user IDs and relevant
records; an account role or display name does not prove ownership. `activeRole`
is a UI field, not an independent permission.

Invalid credentials/sessions return 401, forbidden portal/enrollment/role returns
403, duplicate email/username returns 409, invalid input returns 422, throttled
attempts return 429, and unavailable/unconfigured persistence returns 503.
Login allows 10 attempts per normalized identifier per 15-minute window;
signup/login share 100 attempts per client IP per window. IPs come from the
server's client address: configure trusted proxy forwarding at deployment.

## Integration boundaries

Frontend signup, login, session restoration, and logout call these APIs
asynchronously. Registrar signup transmits `registrarCode` to the server.
Old locally stored accounts and login records are removed when the app loads;
they are not migrated because they contain unverified identity claims.
Existing demo passwords and browser registrations are not backend accounts.
Parcel/transfer/token fixtures and their browser storage remain until those
backend features are implemented. Profile editing reports that its API is
not connected instead of pretending to save to a browser account.
Signup creates a separate database
identity; claiming an existing landholder identity requires verified enrollment
and is deliberately not inferred from matching names or emails.

Email verification, password reset, profile editing, Aadhaar/DigiLocker,
wallet linking, and land-specific permissions are separate features. Deploy
behind HTTPS. Periodically delete expired `auth_sessions` and expired
`auth_rate_limits` rows; neither grants access after expiry.

## Verification

### Optional two-channel login OTP

Set `LOGIN_OTP_ENABLED=true` only after configuring `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` (VA...), `RESEND_API_KEY`, and
`OTP_EMAIL_FROM`. SMS uses Twilio Verify; no sender number is needed. Configure
the Verify service to generate six-digit codes. For Resend's development sender
`TitleLock <onboarding@resend.dev>`, set `OTP_TEST_RECIPIENT_EMAIL` to the email
used to register with Resend; all other recipients are rejected before sending.
General email delivery requires your own verified sender domain.

With OTP enabled, signup saves the account and asks the user to sign in, without
issuing a session. Login validates the password and returns a five-minute
challenge with masked email/phone hints. `POST /api/auth/otp/verify` takes
`challenge_id`, `email_code`, and `sms_code`. Both must pass before a session is
created. Email codes are HMAC-hashed in PostgreSQL; SMS codes are generated and
checked by Twilio. Challenges permit five attempts, are single-use, and are
invalidated by a new login or a contact change. Sending is limited to three
attempts per account per 15 minutes in addition to the normal login throttles.
Restarting login requests new codes; no code is returned or logged by the API.

Enabling OTP rejects older sessions that were created without OTP. Successful
OTP sets email/phone verification timestamps, proving possession of those
destinations, not Aadhaar or government-ID linkage. Provider failures do not
create a session. Apply `migrations/003_account_workflows.sql` before enabling.
Its profile/officer/linking fields are preparation only; those workflows are
not exposed by the current API. External-provider delivery remains unverified
until a user completes a real end-to-end test. Tests mock delivery and never
send real messages.

```sh
.venv/bin/python -m pytest
```

HTTP tests use a persistence double while exercising real Argon2 hashing and
FastAPI dependencies. PostgreSQL integration tests require a dedicated empty
database, never the project database:

```sh
AUTH_TEST_DATABASE_URL=postgresql://.../titlelock_auth_test .venv/bin/python -m pytest tests/test_auth_postgres.py
```


### Property ownership access

`GET /api/properties/my` requires a citizen session and returns active ownerships
for that account's user ID or its approved registry identity links. It does not
match display names. The citizen property list and dashboard use this endpoint.
The rest of the registry/map and transaction demo screens are not backend APIs yet.

For an existing registry identity, submit `POST /api/properties/identity-link`
with `registry_user_id` (UUID supplied by the registry office) and
`evidence_reference` (a document/check reference, not raw identity numbers).
`GET /api/properties/identity-link` shows only the caller's requests.
Requests alone grant no access. There is no automatic Aadhaar verification.

An operator must verify original identity/ownership evidence outside this app,
then approve using database operator access from the backend directory:

```sh
.venv/bin/python -m app.cli.link_identity REQUEST_UUID --evidence OFFICE_CHECK_REFERENCE
```

This records an approval and evidence-check reference without modifying ownership.
No production identity has been linked by these changes. Approval is intentionally
not exposed to registrar signup accounts that only passed a shared signup code.


`GET /api/properties/{ulpin}` returns the owned parcel's recorded details,
active co-owner names and shares (basis points), encumbrances, disputes and
conveyance history. The caller needs active ownership directly or through an
approved identity link. Missing and inaccessible properties both return 404;
unauthenticated requests return 401. Responses use `Cache-Control: no-store`.
The My Properties “View Record of Rights” modal fetches this endpoint each time
it opens, with loading/error states and no browser-storage fallback.

### Registrar-requested sales

The live sale workflow is `/registrar/petitions` and `/citizen/tokens`.
Old client-generated sell tokens do not authorize any backend operation.

- `POST /api/sales`: registrar supplies parcel ID, buyer username and deed document hash.
- `GET /api/sales`: only deals involving the current account; no key fingerprints returned.
- `POST /api/sales/{id}/keys/owner` or `/keys/registrar`: generate a one-time displayed, random 256-bit key. The database stores only an HMAC-SHA256 fingerprint using independent `SALE_TOKEN_SECRET` from `.env`.
- `POST /api/sales/{id}/approve/owner` or `/approve/registrar`: each party submits its own key from its authenticated session. A key alone cannot approve a sale. Raw keys are not stored in browser storage, application logs, or the database.
- `POST /api/sales/{id}/complete`: assigned registrar completes database ownership transfer after its approval and every active owner's approval. Current ownership shares and property restrictions are rechecked under row locks. This does not submit a blockchain transaction or verify legal deed authenticity.

All active owners must approve joint sales; the approval window starts at first owner-key generation and lasts 24 hours. Registrar key generation beforehand does not start the clock. Issued keys cannot be retrieved or regenerated. Save them securely; a lost key will require expiry and the cooldown.

A deal not completed before its deadline expires, invalidates its keys, and blocks new sales until seven days after that deadline. A 30-second background sweep persists expiry; request-time checks enforce it even after downtime. The separate sale cooldown does not clear legal/dispute freezes. Pending requests without an owner key have no running deadline.

Apply `migrations/004_sales.sql` before using these routes. Existing ownership is not changed by this migration; it changes only when the assigned registrar explicitly completes an approved sale. The document hash is supplied by the registrar and is not document verification.

### Sale tracking, activity and in-app notifications

Apply `migrations/005_sale_activity.sql`. `sale_events` records the actor and time
of request creation, key issuance, approvals, expiry and database completion;
`sale_notifications` stores per-account read state. The event and its recipient
notifications commit in the same transaction as the sale action. No raw key or
key fingerprint is copied into either table.

- `GET /api/sales/{id}/events?limit=50&before_id=...`: participants only; newest first.
- `GET /api/notifications?unread_only=true&limit=50&before_id=...`: caller's inbox only.
- `POST /api/notifications/{event_id}/read`: idempotently marks only the caller's notification.

Both list endpoints cap pages at 100 rows and use no-store responses. History
has no public edit/delete endpoint, but is ordinary PostgreSQL history, not a
blockchain-anchored or tamper-proof ledger. Existing deals are preserved and
historical actions before migration are not fabricated or backfilled.

Citizen Transactions and registrar Sale Activity use the real participant sale
list with per-deal timelines. Both notification bells open database-backed
inboxes. Notifications are in-app only; no email/SMS delivery is added here.

### Dated transaction outcomes

Apply `006_transfer_failures.sql`. Transactions shows request, completion and
expiry dates, plus the latest failed completion attempt and its reason. The
activity timeline retains every attempt, even after a later successful transfer.
Green marks completed transfers, red marks failures/expiry, and amber marks pending
deals. Failed attempts are recorded in a separate transaction after ownership
changes roll back; only the assigned registrar's attempts are recorded. A failed
attempt does not convert a retryable pending deal into a terminal failed deal.
Database outages can prevent recording; those failures are reported in server logs
without sensitive request data. Historical failures before tracking cannot be reconstructed.
