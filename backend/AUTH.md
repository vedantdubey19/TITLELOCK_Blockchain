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

## Monitoring and recovery

`GET /api/health` is a liveness check. Configure the load balancer to poll
`GET /api/readiness` instead: it returns 200 only when PostgreSQL and the
configured blockchain are reachable, otherwise 503 with only dependency
statuses (`ok`, `unavailable`, or `not-required`). It never returns URLs,
credentials, keys, transaction payloads, or provider error text.

Every response includes `X-Request-ID`. Unexpected server errors log only that
ID, method, path, and error class; request bodies and secrets are excluded.
Send alerts from the hosting provider when readiness stays non-200 for several
minutes, and alert on its database/RPC provider availability separately.

Pending prepared blockchain deals are reconciled on startup and every 30
seconds. The database changes ownership only after an exact confirmed registry
event, and row locks plus the contract replay guard make repeated reconciliation
safe after restarts or RPC interruptions. A failed/unknown RPC response leaves
the deal reserved; it never grants ownership. Back up PostgreSQL before upgrades
with `python -m app.cli.database_backup backup ...`; restore into a separate
recovery database first and reconcile it against the chain before serving it.

For host automation, use `encrypted-backup` with a separate chmod-600
passphrase file: `python -m app.cli.database_backup encrypted-backup
backups/registry.pgdump.enc --encryption-passphrase-file /run/secrets/titlelock_backup_passphrase`.
The archive is AES-256-CBC encrypted with PBKDF2 and authenticated with a
separate derived HMAC before decryption. Restore only into a separate recovery
database with `encrypted-restore ... --target-env-file ...
--encryption-passphrase-file ...`. Copy the example schedules in
`deploy/titlelock-backup.cron.example` and
`deploy/titlelock-readiness.cron.example` into the host scheduler after
replacing the URL and paths. Keep the encryption passphrase, database URL, and
backup storage credentials outside Git and outside the same storage account as
the archives.

The included `backend/Dockerfile` runs FastAPI on port 8000, and the
`frontend/Dockerfile` serves the compiled SPA on port 8080 and proxies `/api`
to a `titlelock-api` service on the same private network. Put both behind the
host's HTTPS reverse proxy, configure its exact trusted proxy address for
Uvicorn, and inject the values from `.env.production.example` through the
host's secret manager. Apply migrations and restore a tested PostgreSQL backup
before routing traffic. Do not publish a container with development or Sepolia
demo credentials.

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

### Local blockchain + MetaMask (Anvil 31337 and Sepolia 11155111)

The contract is `blockchain/src/TitleLockRegistry.sol`, compiled with Solidity
0.8.37, OpenZeppelin 5.7.0, and Foundry 1.8.5. Python uses web3.py 7.16.0 and
eth-account 0.14.0. A real Anvil node is required; no in-memory fake is used in
`CHAIN_MODE=live`. Only Anvil (31337) and Sepolia (11155111) are accepted; mainnet is rejected.

Build from the project root after installing Foundry:

```sh
cd blockchain
forge install OpenZeppelin/openzeppelin-contracts@v5.7.0 --no-git
forge build
forge test
mkdir -p state
anvil --host 127.0.0.1 --port 8545 --chain-id 31337 --block-time 1 --state state/anvil.json --state-interval 5 --silent
```

Install Foundry with `foundryup` and ensure `forge` and `anvil` are on `PATH`.
Do not delete/reset the persisted Anvil state when comparing existing records.

Apply migration 007, deploy from the backend directory, and paste the printed
contract address into the gitignored `.env`:

```sh
.venv/bin/python -m app.cli.local_chain deploy
```

Set `CHAIN_MODE=live`, `CHAIN_ID=31337`, `CHAIN_RPC_URL=http://127.0.0.1:8545`,
`CHAIN_CONTRACT_ADDRESS=<deployed address>`, and `CHAIN_CONFIRMATIONS=1`.

Each participant links a distinct MetaMask wallet through a signed, single-use,
five-minute EIP-712 challenge. Accounts and wallets cannot be rebound by the API.
Private keys and recovery phrases never enter the backend or its database.
The registrar needs test ETH for gas. Local-only administration commands are:

```sh
.venv/bin/python -m app.cli.local_chain fund WALLET_ADDRESS
.venv/bin/python -m app.cli.local_chain authorize-registrar USERNAME
.venv/bin/python -m app.cli.local_chain anchor ULPIN --evidence OFFICE_CHECK_REFERENCE
```

Use `--demo` before the command to administer the isolated test database instead.
Initial anchors require an operator evidence check and full owner shares; they
cannot overwrite an existing blockchain baseline. Do not anchor unverified
records merely to make a mismatch disappear.

Key approval is required before saving a participant wallet signature. All owners
and the assigned registrar sign one EIP-712 Transfer, bound to contract, chain,
unique deal ID, property ID, previous/new ownership hashes, buyer, registrar,
document hash and deadline. The contract independently verifies all current owner
signatures and the assigned authorized registrar, deadline and unused deal ID.
The frontend asks MetaMask to send the registrar transaction only after the backend
verifies the existing key approvals and wallet signatures. Keys stay off-chain.

`/complete` in live mode prepares a wallet transaction instead of updating ownership.
The parcel remains reserved during PREPARED/SUBMITTED states. The background worker
and manual refresh reconcile confirmed events, even if the browser closed after
broadcast. Replays do not duplicate database ownership. Reverted transactions can
be retried; an unexecuted transaction after deadline expires into the seven-day
cooldown. RPC outages leave verification unavailable and prepared deals reserved.
A database mismatch after mining enters REVIEW instead of silently overwriting data.

Ownership commitments use canonical JSON with a schema version, property ID, survey
number, normalized area, ownership type, current primary owner UUID, and active
owner UUID/share pairs. Verification also compares anchored transfer document and
ownership hashes and the recorded history entry with contract events. This checks
consistency, not legal authenticity. Existing pre-chain history is not retroactively
claimed to be anchored. The local chain is a development tool, not an independently
operated production trust anchor. Raw keys, passwords, Aadhaar and documents stay
out of blockchain records.

Opt-in real-chain backend integration test:

```sh
CHAIN_TEST_RPC=http://127.0.0.1:8545 AUTH_TEST_DATABASE_URL=<isolated-test-db> .venv/bin/python -m pytest
```

The integration test deploys its own contract and uses disposable wallets in an
isolated database schema. Actual MetaMask unlock/link/sign/send prompts remain
manual user actions and are not replaced with automated wallet approval.

Wallet-link messages and public signatures are retained as proof and checked before using a stored address. Database edits to wallet mappings fail verification. Transaction dates for anchored transfers are also checked against on-chain execution timestamps.

### Exchanged sale keys and property discovery

Migration `008_sale_exchange.sql` gives new deals exchange version 2: each owner
enters the assigned registrar's key; the assigned registrar enters each owner's
key. Both sides must finish, including every co-owner, before completion. Keys
remain HMAC fingerprints only, scoped to their originating account and deal.
The existing 24-hour deadline and seven-day cooldown still apply. Older deals
retain their original version-1 key semantics so already issued keys are not
silently reinterpreted; the UI labels those deals as legacy.

Sale requests snapshot buyer name and phone for participant-only notifications.
The citizen explorer and registrar ULPIN lookup read `/api/properties/discover`;
no phone numbers or identity documents are exposed through discovery. Every
current owner must opt in through `/{ulpin}/availability` before advertising a
parcel for sale. Transfer settlement clears listing consents, retains ownership
history, and changes only active ownership. Blockchain comparison is available
to authenticated citizens and registrars, including prospective buyers.

`parcel_map_geometry` holds surveyed `[longitude, latitude]` boundaries with a
source reference. The supplied database has no boundary coordinates; discovery
therefore shows records and an explicit missing-boundary message instead of
fabricated polygons. Import reviewed survey boundaries before a real map demo.

### Account workflows (backend Phase 3)

Apply migration 009. Registrar signup now requires `officerId` and the existing
private invitation code, but returns `pendingApproval` without a session. Officer
IDs are stored as a secret-key HMAC; a last-four suffix is retained only for IDs of at least eight characters. Raw IDs are never stored.
Existing officer accounts also require review before backend access. The signup
code alone no longer authorizes an officer; this is manual evidence review,
not a government identity-provider integration.

From `backend/`, a trusted database operator can run:

```sh
.venv/bin/python -m app.cli.review_officer list
.venv/bin/python -m app.cli.review_officer approve USERNAME --evidence OFFICE-CHECK-REFERENCE
.venv/bin/python -m app.cli.review_officer reject USERNAME --evidence CHECK-REFERENCE
.venv/bin/python -m app.cli.review_officer revoke USERNAME --evidence CHECK-REFERENCE
.venv/bin/python -m app.cli.link_identity --list
.venv/bin/python -m app.cli.link_identity REQUEST_UUID --evidence CHECK-REFERENCE
.venv/bin/python -m app.cli.link_identity REQUEST_UUID --reject --evidence CHECK-REFERENCE
```

Approval prompts privately for the officer ID reviewed against original evidence.
Decisions record the database operator, reference and timestamp, and revoke prior
sessions/challenges. No public endpoint can approve a registrar or ownership link.
Revoking backend access does not retract an already signed blockchain transaction;
contract registrar roles must also be revoked by the chain administrator.

`PATCH /api/auth/profile` accepts name, email, phone, jurisdiction, description,
and personal profile fields already defined by `ProfileUpdate`. It cannot change
username, role, Aadhaar, officer ID, ownership, wallet or verification flags.
Registrar jurisdiction is operator-managed. Email/phone changes require
`currentPassword`, reset the relevant verification flag, consume outstanding OTP
challenges and revoke all sessions; the response sets `login_required: true`.
`GET /api/auth/me` returns the persisted profile and actual verification flags.
Profile nominee/guardian fields are descriptive only, not legal succession grants.
These backend responses still need wiring into the relevant frontend forms.

### Risk and succession review (backend Phase 4)

Apply migration 010. `/api/risk/assessments` issues a registrar-only, deal-bound,
single-use assessment valid for 30 minutes. A sale may provide `assessment_id`;
otherwise creation assesses automatically. Creation and completion both check
fresh facts. The version-1 deterministic rules cover ownership/share consistency,
legal restrictions (including unresolved claims and recorded high risk), workflow
conflicts, reused documents, and blockchain consistency. Scores are rule points,
not calibrated fraud probabilities or proof of title. Mock mode explicitly marks
the blockchain check as not checked; live mode fails closed on chain errors.
Boundary overlap and document authenticity are not verified by this engine.

Document reuse checks include pending/completed sale records, with a shared
transaction lock to prevent concurrent reuse across parcels. Expired requests
may be refiled. Assessment binding includes registrar, buyer, parcel, document,
and the current record snapshot. No approval or hold resolution overrides a
court freeze, active claim or database/blockchain mismatch.

Verified registrars can list assessments, open an evidence-backed risk hold, and
resolve a hold with a recorded reason/reference. `/api/risk/holds` shows open
holds; `include_resolved=true` includes their audit history. Opening a new hold
is blocked while a chain deal is PREPARED/SUBMITTED/REVIEW because already signed
or broadcast transactions cannot be silently undone by a database-only action.

Succession is explicitly REVIEW-ONLY, as requested. A proposed heir or surviving
co-owner submits `/api/succession` with the deceased owner's registry UUID,
registered heir accounts and shares, death/legal-evidence references and a SHA256
document hash. Shares must allocate exactly that owner's active share; surviving
co-owner shares are not reassigned. References are claims until manual review;
no death status or document authenticity is inferred automatically.

Unreviewed SUBMITTED claims do not freeze property or block sales. An independent
verified registrar accepts a case using `/{id}/assign`; IN_REVIEW and
EVIDENCE_VERIFIED cases block sale actions. The assigned registrar may mark
EVIDENCE_VERIFIED or REJECTED with evidence and a note. A rejected case releases
only its own workflow hold. A different verified registrar can take over only
if the previous registrar is no longer active/verified. Applicants can withdraw
only unassigned claims. Ownership snapshots prevent endorsing stale claims.

Case details/events are available only to the applicant, named heirs, current
owners (including approved linked identities), and verified registrars. Lists
and event histories are bounded and paginated. All sensitive responses use
no-store. Every succession response that endorses evidence explicitly returns
`transfer_enabled: false`: no ownership is changed and no blockchain transaction
is submitted. Nominee profile fields never grant an inheritance automatically.
The final succession transfer authority/contract policy remains deferred.
Frontend succession/risk screens are not wired by this backend-only phase.

### Sepolia deployment preparation

Only Anvil (31337) and Ethereum Sepolia (11155111) are supported; mainnet remains
blocked. Sepolia settings require an HTTPS RPC endpoint and at least three block
confirmations. These confirmations reduce reorg risk; they are not consensus
finality. Wallet binding and transfer signatures are scoped to the configured
chain and contract. Existing local wallet bindings cannot be silently reused on
Sepolia. Use a separate database/schema and reviewed new anchors, keeping local
history and pending deals intact. No automatic data migration or deployment occurs.

The gitignored `backend/.env.sepolia` is a separate setup file. Put the provider
HTTPS endpoint in `CHAIN_RPC_URL`; do not put wallet private keys or recovery
phrases in any backend environment file. It is not loaded by the running local
server. Application deployment must explicitly load its environment values.

Build the existing contract with the pinned Foundry/Solidity configuration before
signing deployment from a dedicated test wallet. Foundry supports local encrypted
keystores/hardware signing; signing stays under the operator's control. After a
successful wallet-signed deployment, from `backend/` run:

```sh
.venv/bin/python -m app.cli.sepolia --env-file .env.sepolia TRANSACTION_HASH
```

This verifies Sepolia, successful contract creation, exact compiled creation
bytecode, canonical receipt block, confirmations, deployed code and deployer admin
role. It prints the contract address and deployment block for the separate config;
it does not change the existing local deployment. Registrar role grants and initial
property anchors still require separate operator review and admin-wallet signing.
The `local_chain` CLI deliberately retains its Anvil-only unlocked-account guard.
Hosted operation is not complete until those steps and an end-to-end Sepolia
transfer have been confirmed. RPC providers can impose event-query range limits;
validate the chosen provider against actual history before public use.

### Isolated Sepolia workflow demo

`python -m app.cli.sepolia_demo setup` creates synthetic accounts and a property
inside `titlelock_auth_test`, schema `titlelock_sepolia_demo`, and saves its scoped
connection/secrets in the ignored `.env.sepolia`. It copies no main records.
`python -m app.cli.sepolia_demo serve` serves the built frontend and API on
127.0.0.1:5003. This is a local test fixture with known demo credentials, never a
production server. Wallets must bind again against the Sepolia contract domain.

`python -m app.cli.sepolia_admin prepare --registrar USERNAME --parcel ULPIN
--admin ADDRESS --output PATH` produces public unsigned role/anchor calldata for
reviewed accounts. `python -m app.cli.deploy_wallet --transactions PATH` serves a
loopback-only MetaMask signing page. It never handles a private key. Role grants
require administrator approval; initial anchors require reviewed ownership and
`confirm-anchor TRANSACTION_HASH --parcel ULPIN --evidence REFERENCE` verifies the
canonical receipt, exact registry event, owner wallets and hash before recording
the baseline. Existing differing baselines cannot be overwritten.

For the free Alchemy plan, historical event requests can be limited to ten blocks.
`CHAIN_LOGS_RPC_URL` optionally selects a separate HTTPS Sepolia event provider;
all other reads stay on `CHAIN_RPC_URL`. Both endpoints must report the configured
chain ID and agree on the canonical head block. A lagging/disagreeing event source
fails verification closed. Queries are bounded by `CHAIN_LOG_BLOCK_RANGE` and start
at the verified deployment block. Do not silently advance that block to skip logs.

MetaMask Added Protection can route a transaction through another contract. Keep
protection enabled: a routed transfer is accepted only with the assigned sender
and an exact OwnershipTransferred event from this registry, matching the entire
signed deal. A pending routed transaction is not accepted as execution proof; the
worker independently reconciles confirmed registry events. Database ownership
updates still require the configured confirmation count and matching prior state.


Sepolia verification caches confirmed event ranges in bounded process memory,
checks the cached checkpoint against the canonical chain on each request, and
invalidates the cache after a reorg. A cold request scans at most four configured
ranges, then returns 503 while later retries resume the verified cursor. Restarting
the process rebuilds this cache; it is not trusted database state. Deployed Sepolia
configuration requires a positive verified deployment block.

The succession owner lookup is private to verified registrars, current owners
(including approved identity links), and existing case participants. An initial
heir applicant can obtain the deceased owner's registry reference from the
registrar/evidence intake; arbitrary authenticated citizens cannot enumerate
co-owner identities and shares through this endpoint.


### Production configuration baseline

`backend/.env.production.example` is a blank deployment template, not active credentials.
Keep the frontend and `/api` behind the same HTTPS origin: existing browser requests use
same-origin credentials and the session cookie is HttpOnly, Secure in production,
SameSite=Strict, host-only, with path `/api`.

Production startup rejects short/repeated/shared secrets, missing or wildcard hosts,
non-HTTPS frontend origins, database administrator usernames, demo/test database names
or search paths, and PostgreSQL connections without `sslmode=verify-full`. Configure
the hosting provider's CA through `sslrootcert`; actual TLS connectivity and database
role privileges still need verification on the chosen host. Blank registrar signup
code disables registrar signup. Generate each enabled secret independently using
`python -c "import secrets; print(secrets.token_urlsafe(48))"` in a private terminal.
Never put server secrets in `VITE_*` variables or Git. Preserve existing HMAC keys when
moving an existing database: replacing them requires a planned identity/token migration.

Production disables Swagger, ReDoc and OpenAPI endpoints, known demo logins and the
synthetic demo CLI. Production uses only the deployed Sepolia test contract with at
least three confirmations; this does not authorize mainnet transactions. Login OTP
remains optional and off unless complete provider configuration is supplied.

The API checks exact browser origins, hostnames and HTTPS, adds HSTS on HTTPS responses,
and disables caching on API responses. CORS has explicit origins, methods and headers.
Cookie-authenticated mutations require a browser Origin; non-browser Bearer clients
can operate without one. Disallowed cross-site mutations are rejected.

Hosting must terminate TLS and proxy `/api` to a private Uvicorn listener. For a proxy
on the same machine, run from `backend/`:
`uvicorn app.main:app --host 127.0.0.1 --port 5001 --proxy-headers --forwarded-allow-ips=127.0.0.1 --no-server-header`.
Trust only the actual proxy IP if the topology differs; never trust all forwarded
headers or expose the API's plain HTTP listener publicly. These changes do not install
a certificate, deploy a website, validate a hosted database, or configure backups and
monitoring; those remain deployment steps.

### Database backup and offline recovery

Requires PostgreSQL `pg_dump` and `pg_restore` compatible with the server version.
From `backend/`, run:
`python -m app.cli.database_backup backup backups/registry-2026-10-21.pgdump`.
By default the source follows normal application configuration (environment over `.env`).
Use `--env-file` to select an explicit source file; its `DATABASE_URL` takes priority
over an exported URL, while production settings validation still runs. The command backs up the
whole database, including every non-system schema, not only a DSN's search_path.

Each custom-format archive has a private `.json` manifest containing its SHA-256,
creation time and table row counts. An exported repeatable-read snapshot keeps counts
and the archive consistent during concurrent writes. Existing files are never replaced;
failed backups remove their own incomplete files. Files are mode 600 in a mode-700
backup directory and archives are ignored by Git. Credentials use temporary private
libpq service/password files, never process arguments or raw error output.

These archives are **not encrypted by this command**. They contain personal data and
password hashes. Store them on encrypted storage, copy them to protected off-site
storage, and configure a host-managed schedule/retention policy before public hosting.
The command is schedulable but does not create a scheduler or delete older backups.
Checksums detect corruption, not a maliciously replaced archive and manifest: restore
only archives from your trusted backup storage.

Create a new empty database named `titlelock_restore_<unique_suffix>`. In a private,
git-ignored `.env.restore` file (mode 600), set its explicit `DATABASE_URL`. Then run:
`python -m app.cli.database_backup restore backups/registry-2026-10-21.pgdump --target-env-file .env.restore`.
The target must be offline with no application traffic. Existing databases are never
cleaned or overwritten. Restore uses one PostgreSQL transaction, verifies row counts,
and then invalidates restored sessions and pending login/wallet challenges. A failed
verification leaves a recovery database that must remain offline; recreate a fresh
empty target before retrying.

The archive preserves registry, sale, audit and blockchain-reference tables, but does
not back up Ethereum, uploaded files, database roles, or server secrets. Recover HMAC
keys separately from protected secret storage. Before directing the API to the restored
database, verify migrations/privileges, application ownership records and canonical
Sepolia state, and reconcile prepared/submitted deals. Never reset blockchain baselines
to make an old database snapshot appear current. A successful SQL restore alone is not
permission to reopen transfers.
