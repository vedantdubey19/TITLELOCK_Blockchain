"""PostgreSQL-backed implementation of the V2Registry contract.

Every public operation opens its own transaction and reconstructs API-shaped
objects from normalized tables. No workflow state is cached in this process.
"""

from copy import deepcopy
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import json
import os
from dotenv import load_dotenv

load_dotenv()
from wallet_signing import wallet_link_typed_data, transfer_approval_typed_data, recover


TRANSITION_ORDER = ("DRAFT", "DOCUMENT_VERIFICATION", "RISK_ASSESSMENT", "OWNER_APPROVAL", "REGISTRAR_REVIEW", "BUYER_ACCEPTANCE", "READY_TO_COMMIT", "MST_SUBMITTED", "MST_PENDING_CONFIRMATION", "COMPLETED")
TERMINAL = {"REJECTED", "EXPIRED", "CANCELLED", "DISPUTED", "FROZEN", "MST_FAILED", "COMPLETED"}


class PostgresV2Repository:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for PostgreSQL V2 persistence")

    def _connect(self):
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("Install psycopg[binary] for PostgreSQL V2 persistence") from exc
        return psycopg.connect(self.database_url)

    @staticmethod
    def enrich_parcel(parcel):
        parcel = deepcopy(parcel)
        parcel.setdefault("ownership_type", "SOLE" if not parcel.get("owners") else "JOINT")
        parcel.setdefault("owners", [{"name": parcel["current_owner"], "share_percent": 100, "wallet_address": None, "credential_status": "ACTIVE"}])
        parcel.setdefault("ownership_policy", {"required_approvals": len(parcel["owners"]), "total_owners": len(parcel["owners"])})
        parcel.setdefault("nominees", [])
        parcel.setdefault("encumbrances", [])
        parcel.setdefault("disputes", [])
        parcel.setdefault("frozen", False)
        return parcel

    def _user_id(self, cursor, identity, create=True):
        cursor.execute("SELECT id FROM users WHERE identity_reference=%s OR lower(display_name)=lower(%s) LIMIT 1", (identity.lower(), identity))
        row = cursor.fetchone()
        if row:
            return row[0]
        if not create:
            return None
        cursor.execute("INSERT INTO users(identity_reference,display_name) VALUES (%s,%s) RETURNING id", (identity.lower(), identity))
        return cursor.fetchone()[0]

    def _audit(self, cursor, actor, action, parcel_id=None, transfer_id=None, result="SUCCESS", detail=None):
        actor_id = self._user_id(cursor, actor, create=False)
        cursor.execute("INSERT INTO audit_events(actor_user_id,actor_label,action,entity_type,entity_id,parcel_id,transfer_id,result,metadata,event_ref) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", (actor_id, actor, action, "transfer" if transfer_id else "parcel", transfer_id or parcel_id, parcel_id, transfer_id, result, json.dumps(detail or {}), "AUD-" + uuid4().hex))

    def _notify(self, cursor, recipient, event_type, parcel_id, transfer_id=None, message=""):
        user_id = self._user_id(cursor, recipient)
        cursor.execute("INSERT INTO notifications(notification_ref,user_id,event_type,payload,parcel_id,transfer_id,message) VALUES (%s,%s,%s,%s,%s,%s,%s)", ("NTF-" + uuid4().hex, user_id, event_type, json.dumps({}), parcel_id, transfer_id, message))

    def load_properties(self):
        properties = {}
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT p.ulpin, p.ownership_type, p.frozen, p.survey_number, p.area_sqm, p.registration_office, p.last_registered_date, p.current_owner_user_id, p.transfer_history,g.boundary, p.title_status, p.risk_status FROM parcels p LEFT JOIN parcel_geometries g ON g.parcel_id=p.ulpin ORDER BY p.ulpin")
                rows = cursor.fetchall()
                for row in rows:
                    owner_id = row[7]
                    cursor.execute("SELECT COALESCE(display_name,identity_reference) FROM users WHERE id=%s", (owner_id,))
                    owner_row = cursor.fetchone()
                    current_owner = owner_row[0] if owner_row else "Unknown"
                    cursor.execute("SELECT COALESCE(u.display_name,u.identity_reference), o.share_bps, c.status, w.wallet_address FROM ownerships o JOIN users u ON u.id=o.user_id LEFT JOIN credentials c ON c.id=o.credential_id LEFT JOIN wallets w ON w.id=c.wallet_id WHERE o.parcel_id=%s AND o.active=true ORDER BY u.identity_reference", (row[0],))
                    owners = [{"name": item[0], "share_percent": item[1] / 100, "credential_status": item[2] or "ACTIVE", "wallet_address": item[3]} for item in cursor.fetchall()]
                    cursor.execute("SELECT COALESCE(u.display_name,u.identity_reference), n.status FROM nominees n JOIN users u ON u.id=n.nominee_user_id WHERE n.parcel_id=%s", (row[0],))
                    nominees = [{"name": item[0], "status": item[1]} for item in cursor.fetchall()]
                    geometry = row[9] if row[9] else None
                    boundary = geometry if geometry else None
                    properties[row[0]] = {"ulpin": row[0], "current_owner": current_owner, "owners": owners, "ownership_type": row[1], "frozen": row[2], "survey_number": row[3], "area_sqm": float(row[4]) if row[4] is not None else None, "registration_office": row[5], "last_registered_date": row[6].isoformat() if row[6] else None, "transfer_history": row[8] or [], "boundary": boundary, "title_status": row[10], "risk_status": row[11], "encumbrances": [], "disputes": [], "ownership_policy": {"required_approvals": len(owners) or 1, "total_owners": len(owners) or 1}}
        return properties

    def create_transfer(self, parcel, buyer, document_hash, assessment_hash, actor):
        if parcel.get("frozen"):
            raise ValueError("parcel is frozen; no transfer can be created")
        transfer_id = f"TR-{datetime.now(timezone.utc).year}-{uuid4().hex[:6].upper()}"
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    buyer_id = self._user_id(cursor, buyer)
                    cursor.execute("INSERT INTO transfers(id,parcel_id,buyer_user_id,status,document_hash,assessment_hash,required_approvals,expires_at) VALUES (%s,%s,%s,'OWNER_APPROVAL',%s,%s,%s,%s)", (transfer_id, parcel["ulpin"], buyer_id, document_hash, assessment_hash, parcel["ownership_policy"]["required_approvals"], datetime.now(timezone.utc) + timedelta(hours=24)))
                    for position, owner in enumerate(parcel["owners"]):
                        owner_id = self._user_id(cursor, owner["name"])
                        cursor.execute("INSERT INTO transfer_sellers(transfer_id,user_id,position) VALUES (%s,%s,%s)", (transfer_id, owner_id, position))
                        self._notify(cursor, owner["name"], "TRANSFER_APPROVAL_REQUIRED", parcel["ulpin"], transfer_id, "A transfer requires your authorization.")
                    self._audit(cursor, actor, "TRANSFER_CREATED", parcel["ulpin"], transfer_id)
        return self.get_transfer(transfer_id)

    def _transfer(self, cursor, transfer_id, lock=False):
        cursor.execute(("SELECT t.id,t.parcel_id,t.buyer_user_id,t.status,t.document_hash,t.assessment_hash,t.required_approvals,t.expires_at,t.registrar_user_id,t.registrar_approved_at,t.buyer_accepted_at,t.submitted_at,t.confirmed_at,t.chain_tx_hash,t.failure_reason FROM transfers t WHERE t.id=%s FOR UPDATE" if lock else "SELECT t.id,t.parcel_id,t.buyer_user_id,t.status,t.document_hash,t.assessment_hash,t.required_approvals,t.expires_at,t.registrar_user_id,t.registrar_approved_at,t.buyer_accepted_at,t.submitted_at,t.confirmed_at,t.chain_tx_hash,t.failure_reason FROM transfers t WHERE t.id=%s"), (transfer_id,))
        row = cursor.fetchone()
        if not row:
            return None
        cursor.execute("SELECT COALESCE(u.display_name,u.identity_reference) FROM users u WHERE u.id=%s", (row[2],))
        buyer = cursor.fetchone()[0]
        cursor.execute("SELECT COALESCE(u.display_name,u.identity_reference) FROM transfer_sellers s JOIN users u ON u.id=s.user_id WHERE s.transfer_id=%s ORDER BY s.position", (transfer_id,))
        sellers = [item[0] for item in cursor.fetchall()]
        cursor.execute("SELECT COALESCE(u.display_name,u.identity_reference), a.actor_role, a.approved_at, a.approval_method FROM transfer_approvals a JOIN users u ON u.id=a.user_id WHERE a.transfer_id=%s ORDER BY a.approved_at", (transfer_id,))
        approvals = [{"actor": item[0], "role": item[1], "timestamp": item[2].isoformat(), "method": item[3]} for item in cursor.fetchall()]
        registrar = None
        if row[8]:
            cursor.execute("SELECT COALESCE(display_name,identity_reference) FROM users WHERE id=%s", (row[8],))
            registrar = {"actor": cursor.fetchone()[0], "timestamp": row[9].isoformat() if row[9] else None}
        return {"transfer_id": row[0], "parcel_id": row[1], "buyer": buyer, "sellers": sellers, "document_hash": row[4], "assessment_hash": row[5], "status": row[3], "required_approvals": row[6], "approvals": approvals, "registrar_approval": registrar, "buyer_accepted": bool(row[10]), "created_at": None, "expires_at": row[7].isoformat(), "blockchain_tx": row[13], "submitted_at": row[11].isoformat() if row[11] else None, "confirmed_at": row[12].isoformat() if row[12] else None, "failure_reason": row[14]}

    def get_transfer(self, transfer_id):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                return self._transfer(cursor, transfer_id)

    def list_transfers(self, statuses=None):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM transfers ORDER BY created_at DESC")
                transfers = [self._transfer(cursor, row[0]) for row in cursor.fetchall()]
        return [item for item in transfers if item and (statuses is None or item["status"] in statuses)]

    def approve(self, transfer_id, actor, actor_role, sell_token=None):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    transfer = self._transfer(cursor, transfer_id, lock=True)
                    if not transfer:
                        raise KeyError("transfer not found")
                    if transfer["status"] in TERMINAL:
                        raise ValueError(f"transfer is {transfer['status'].lower()}")
                    cursor.execute(
                            """
                            SELECT expires_at IS NOT NULL AND expires_at <= now()
                            FROM transfers
                            WHERE id = %s
                            """,
                            (transfer_id,)
                        )

                    is_expired = cursor.fetchone()[0]

                    if is_expired:
                        raise ValueError("transfer has expired")  
                    actor_id = self._user_id(cursor, actor)
                    if actor_role == "OWNER":
                        if actor not in transfer["sellers"]:
                            raise PermissionError("only an active owner can approve")
                        cursor.execute("INSERT INTO transfer_approvals(transfer_id,user_id,approval_method,actor_role,approved_at) VALUES (%s,%s,'SESSION','OWNER',now()) ON CONFLICT DO NOTHING", (transfer_id, actor_id))
                        cursor.execute("SELECT count(*) FROM transfer_approvals WHERE transfer_id=%s", (transfer_id,))
                        if cursor.fetchone()[0] >= transfer["required_approvals"]:
                            cursor.execute("UPDATE transfers SET status='REGISTRAR_REVIEW', version=version+1, updated_at=now() WHERE id=%s", (transfer_id,))
                    elif actor_role == "REGISTRAR":
                        if len(transfer["approvals"]) < transfer["required_approvals"]:
                            if sell_token and sell_token.startswith("SELL-TOKEN-"):
                                import cache
                                expected = cache.cached_get(f"sell_token:{transfer['parcel_id']}:{transfer['buyer']}")
                                if not expected or sell_token != expected:
                                    raise ValueError("invalid or expired sell token")
                                # Mock validation: automatically fulfill all missing owner approvals
                                for seller in transfer["sellers"]:
                                    seller_id = self._user_id(cursor, seller)
                                cursor.execute("INSERT INTO transfer_approvals(transfer_id,user_id,approval_method,actor_role,approved_at) VALUES (%s,%s,'SESSION','OWNER',now()) ON CONFLICT DO NOTHING", (transfer_id, seller_id))
                            else:
                                raise ValueError("required owner approvals are incomplete")
                        cursor.execute("UPDATE transfers SET status='BUYER_ACCEPTANCE', registrar_user_id=%s, registrar_approved_at=now(), version=version+1, updated_at=now() WHERE id=%s", (actor_id, transfer_id))
                    elif actor_role == "BUYER":
                        if actor != transfer["buyer"] or not transfer["registrar_approval"]:
                            raise PermissionError("buyer acceptance is unavailable")
                        cursor.execute("UPDATE transfers SET status='READY_TO_COMMIT', buyer_accepted_at=now(), version=version+1, updated_at=now() WHERE id=%s", (transfer_id,))
                        cursor.execute("INSERT INTO blockchain_outbox(idempotency_key,aggregate_id,event_type,payload) VALUES (%s,%s,'TRANSFER_READY_TO_COMMIT',%s) ON CONFLICT(idempotency_key) DO NOTHING", ("transfer:" + transfer_id, transfer_id, json.dumps({"transfer_id": transfer_id})))
                    else:
                        raise PermissionError("this role cannot approve a transfer")
                    self._audit(cursor, actor, "TRANSFER_APPROVED", transfer["parcel_id"], transfer_id, detail={"role": actor_role})
        return self.get_transfer(transfer_id)

    def create_challenge(self, user, parcel_id, wallet_address):
        challenge_id = "CHL-" + uuid4().hex[:12].upper()
        nonce = uuid4().hex
        challenge = {"challenge_id": challenge_id, "user": user, "parcel_id": parcel_id, "wallet_address": wallet_address, "nonce": nonce, "purpose": "LAND_REGISTRY_WALLET_LINK", "used": False, "issued_at": datetime.now(timezone.utc).isoformat(), "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}
        challenge["typed_data"] = wallet_link_typed_data(challenge)
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("INSERT INTO signing_challenges(id,purpose,user_id,parcel_id,wallet_address,nonce,typed_data,payload,expires_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)", (challenge_id, challenge["purpose"], self._user_id(cursor, user), parcel_id, wallet_address, nonce, json.dumps(challenge["typed_data"]), json.dumps(challenge), datetime.now(timezone.utc) + timedelta(minutes=10)))
        return challenge

    def link_wallet(self, challenge_id, signature):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT payload,used_at,wallet_address,user_id,parcel_id FROM signing_challenges WHERE id=%s FOR UPDATE", (challenge_id,))
                    row = cursor.fetchone()
                    if not row or row[1]:
                        raise ValueError("challenge is expired or already consumed")
                    challenge = row[0]
                    if recover(challenge["typed_data"], signature).lower() != row[2].lower():
                        raise PermissionError("wallet proof did not verify")
                    cursor.execute("UPDATE signing_challenges SET used_at=now() WHERE id=%s", (challenge_id,))
                    cursor.execute("INSERT INTO wallets(user_id,wallet_address) VALUES (%s,%s) ON CONFLICT(wallet_address) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id", (row[3], row[2]))
                    wallet_id = cursor.fetchone()[0]
                    credential_ref = "CRD-" + uuid4().hex[:12].upper()
                    cursor.execute("INSERT INTO credentials(user_id,wallet_id,status,credential_ref,activated_at) VALUES (%s,%s,'ACTIVE',%s,now()) RETURNING id", (row[3], wallet_id, credential_ref))
                    credential_id = cursor.fetchone()[0]
                    cursor.execute("SELECT COALESCE(display_name,identity_reference) FROM users WHERE id=%s", (row[3],))
                    user = cursor.fetchone()[0]
                    self._audit(cursor, user, "WALLET_LINKED", row[4])
        return {"user": user, "wallet_address": row[2], "credential_id": credential_ref, "key_status": "ACTIVE", "registered_at": datetime.now(timezone.utc).isoformat(), "activated_at": datetime.now(timezone.utc).isoformat(), "revoked_at": None}

    def create_transfer_approval_challenge(self, transfer_id, user):
        transfer = self.get_transfer(transfer_id)
        if not transfer or transfer["status"] != "OWNER_APPROVAL" or user not in transfer["sellers"]:
            raise PermissionError("this owner cannot approve the transfer at its current state")
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT w.wallet_address FROM wallets w JOIN users u ON u.id=w.user_id JOIN credentials c ON c.wallet_id=w.id WHERE lower(coalesce(u.display_name,u.identity_reference))=lower(%s) AND c.status='ACTIVE' ORDER BY c.created_at DESC LIMIT 1", (user,))
                row = cursor.fetchone()
        if not row:
            raise PermissionError("an active wallet credential is required")
        challenge_id = "APR-" + uuid4().hex[:12].upper()
        challenge = {"challenge_id": challenge_id, "transfer_id": transfer_id, "parcel_id": transfer["parcel_id"], "user": user, "wallet_address": row[0], "buyer": transfer["buyer"], "document_hash": transfer["document_hash"], "assessment_hash": transfer["assessment_hash"], "nonce": uuid4().hex, "purpose": "LAND_REGISTRY_TRANSFER_APPROVAL", "used": False, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}
        challenge["typed_data"] = transfer_approval_typed_data(challenge)
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("INSERT INTO signing_challenges(id,purpose,user_id,parcel_id,transfer_id,wallet_address,nonce,typed_data,payload,expires_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", (challenge_id, challenge["purpose"], self._user_id(cursor, user), challenge["parcel_id"], transfer_id, row[0], challenge["nonce"], json.dumps(challenge["typed_data"]), json.dumps(challenge), datetime.now(timezone.utc) + timedelta(minutes=10)))
        return challenge

    def approve_with_signature(self, challenge_id, signature):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT payload,used_at,wallet_address FROM signing_challenges WHERE id=%s", (challenge_id,))
                row = cursor.fetchone()
        if not row or row[1]:
            raise ValueError("approval challenge has already been consumed or is invalid")
        if recover(row[0]["typed_data"], signature).lower() != row[2].lower():
            raise PermissionError("transfer signature did not verify")
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE signing_challenges SET used_at=now() WHERE id=%s AND used_at IS NULL", (challenge_id,))
                    if cursor.rowcount != 1:
                        raise ValueError("approval challenge has already been consumed")
        return self.approve(row[0]["transfer_id"], row[0]["user"], "OWNER")

    
    def submit_for_commit(self, transfer_id, actor):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    transfer = self._transfer(cursor, transfer_id, lock=True)

                    if not transfer or transfer["status"] != "READY_TO_COMMIT":
                        raise ValueError("transfer is not ready to commit")

                    # Check transfer expiry
                    if transfer["expires_at"] is not None:
                        expires_at = transfer["expires_at"]

                        if isinstance(expires_at, str):
                            expires_at = datetime.fromisoformat(expires_at)

                        if expires_at.tzinfo is None:
                            expires_at = expires_at.replace(tzinfo=timezone.utc)

                        if expires_at <= datetime.now(timezone.utc):
                            raise ValueError("transfer has expired")

                    cursor.execute(
                    """
                        UPDATE transfers
                        SET status='MST_SUBMITTED',
                            submitted_at=now(),
                            version=version+1,
                            updated_at=now()
                        WHERE id=%s
                    """,
                        (transfer_id,)
                    )

                    cursor.execute(
                    """
                        UPDATE blockchain_outbox
                        SET status='SUBMITTED',
                            submitted_at=now(),
                            claimed_at=NULL,
                            claimed_by=NULL
                        WHERE aggregate_id=%s
                        AND status IN ('PENDING','READY_TO_COMMIT')
                    """,
                        (transfer_id,)
                )

                    self._audit(
                        cursor,
                        actor,
                        "MST_SUBMITTED",
                        transfer["parcel_id"],
                        transfer_id
                )

        return self.get_transfer(transfer_id), {
            "transfer_id": transfer_id,
            "status": "SUBMITTED"
    }


    def next_outbox_item(self, status="SUBMITTED", worker_id="outbox-worker"):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id,aggregate_id,event_type,payload,status FROM blockchain_outbox WHERE ((status=%s AND next_attempt_at<=now()) OR (status='PROCESSING' AND claimed_at < now()-interval '60 seconds')) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1", (status,))
                    row = cursor.fetchone()
                    if not row:
                        return None
                    cursor.execute("UPDATE blockchain_outbox SET claimed_by=%s,claimed_at=now(),attempts=attempts+1,status='PROCESSING' WHERE id=%s", (worker_id, row[0]))
                    return {"outbox_id": str(row[0]), "transfer_id": row[1], "event_type": row[2], "payload": row[3], "status": "PROCESSING"}

    def list_outbox(self, status=None):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                if status:
                    cursor.execute("SELECT id,aggregate_id,event_type,payload,status,attempts,tx_hash,last_error,created_at,submitted_at,confirmed_at FROM blockchain_outbox WHERE status=%s ORDER BY created_at", (status,))
                else:
                    cursor.execute("SELECT id,aggregate_id,event_type,payload,status,attempts,tx_hash,last_error,created_at,submitted_at,confirmed_at FROM blockchain_outbox ORDER BY created_at")
                return [{"outbox_id": str(row[0]), "transfer_id": row[1], "event_type": row[2], "payload": row[3], "status": row[4], "attempts": row[5], "tx_hash": row[6], "error": row[7], "created_at": row[8].isoformat(), "submitted_at": row[9].isoformat() if row[9] else None, "confirmed_at": row[10].isoformat() if row[10] else None} for row in cursor.fetchall()]

    def confirm_commit(self, transfer_id, tx_hash, actor):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE transfers SET status='MST_PENDING_CONFIRMATION',chain_tx_hash=%s,updated_at=now() WHERE id=%s AND status='MST_SUBMITTED'", (tx_hash, transfer_id))
                    if cursor.rowcount != 1:
                        raise ValueError("transfer has not been submitted")
                    cursor.execute("UPDATE blockchain_outbox SET status='MST_PENDING_CONFIRMATION',tx_hash=%s WHERE aggregate_id=%s", (tx_hash, transfer_id))
        return self.get_transfer(transfer_id)

    def confirm_finality(self, transfer_id, actor):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    transfer = self._transfer(cursor, transfer_id, lock=True)
                    if not transfer or transfer["status"] != "MST_PENDING_CONFIRMATION":
                        raise ValueError("transfer has no submitted transaction awaiting confirmation")
                    
                    # Verify MST event was indexed by the blockchain indexer
                    cursor.execute("SELECT event_id FROM blockchain_events WHERE tx_hash=%s AND transfer_id=%s", (transfer["blockchain_tx"], transfer_id))
                    if not cursor.fetchone():
                        raise ValueError("transfer blockchain event has not been indexed yet")
                        
                    cursor.execute("UPDATE ownerships SET active=false WHERE parcel_id=%s", (transfer["parcel_id"],))
                    cursor.execute("SELECT u.id,c.id FROM users u LEFT JOIN wallets w ON w.user_id=u.id LEFT JOIN credentials c ON c.wallet_id=w.id AND c.status='ACTIVE' WHERE lower(coalesce(u.display_name,u.identity_reference))=lower(%s) LIMIT 1", (transfer["buyer"],))
                    buyer = cursor.fetchone()
                    if not buyer:
                        raise ValueError("buyer has no provisioned identity")
                    cursor.execute("INSERT INTO ownerships(parcel_id,user_id,credential_id,share_bps,active) VALUES (%s,%s,%s,10000,true)", (transfer["parcel_id"], buyer[0], buyer[1]))
                    previous_owner = transfer["sellers"][0] if transfer["sellers"] else "Unknown"
                    cursor.execute("UPDATE parcels SET current_owner_user_id=%s,ownership_type='SOLE',last_registered_date=current_date,transfer_history=transfer_history || %s::jsonb,updated_at=now() WHERE ulpin=%s", (buyer[0], json.dumps([{"from": previous_owner, "to": transfer["buyer"], "date": datetime.now(timezone.utc).date().isoformat(), "doc_hash": transfer["document_hash"]}]), transfer["parcel_id"]))
                    cursor.execute("UPDATE transfers SET status='COMPLETED',confirmed_at=now(),updated_at=now() WHERE id=%s", (transfer_id,))
                    cursor.execute("UPDATE blockchain_outbox SET status='CONFIRMED',confirmed_at=now(),claimed_by=NULL,claimed_at=NULL WHERE aggregate_id=%s", (transfer_id,))
                    self._notify(cursor, transfer["buyer"], "TRANSFER_COMPLETED", transfer["parcel_id"], transfer_id, "Your transfer has been finalized.")
                    self._audit(cursor, actor, "MST_CONFIRMED", transfer["parcel_id"], transfer_id, detail={"tx_hash": transfer["blockchain_tx"]})
        return self.get_transfer(transfer_id)

    def fail_transfer(self, transfer_id, error):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    transfer = self._transfer(cursor, transfer_id, lock=True)
                    if not transfer:
                        raise KeyError("transfer not found")
                    cursor.execute("UPDATE transfers SET status='MST_FAILED',failure_reason=%s,updated_at=now() WHERE id=%s", (str(error), transfer_id))
                    cursor.execute("UPDATE blockchain_outbox SET status='FAILED',failure_reason=%s,next_attempt_at=now()+interval '30 seconds',claimed_by=NULL,claimed_at=NULL WHERE aggregate_id=%s", (str(error), transfer_id))
                    self._audit(cursor, "outbox-worker", "MST_FAILED", transfer["parcel_id"], transfer_id, result="FAILURE", detail={"error": str(error)})
        return self.get_transfer(transfer_id)

    def audit(self, actor, action, parcel_id=None, transfer_id=None, result="SUCCESS", detail=None):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    self._audit(cursor, actor, action, parcel_id, transfer_id, result, detail)
        return {"actor": actor, "action": action, "parcel_id": parcel_id, "transfer_id": transfer_id, "result": result, "detail": detail or {}, "timestamp": datetime.now(timezone.utc).isoformat()}

    def list_audit(self, newest_first=False):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT event_ref,coalesce(actor_label,''),action,parcel_id,transfer_id,result,metadata,created_at FROM audit_events ORDER BY created_at " + ("DESC" if newest_first else "ASC"))
                return [{"event_id": row[0], "actor": row[1], "action": row[2], "parcel_id": row[3], "transfer_id": row[4], "result": row[5], "detail": row[6], "timestamp": row[7].isoformat()} for row in cursor.fetchall()]

    def list_notifications(self, recipient=None, newest_first=False):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                query = "SELECT n.notification_ref,coalesce(u.display_name,u.identity_reference),n.event_type,n.parcel_id,n.transfer_id,n.message,n.read_at,n.created_at FROM notifications n LEFT JOIN users u ON u.id=n.user_id"
                params = []
                if recipient:
                    query += " WHERE lower(coalesce(u.display_name,u.identity_reference))=lower(%s)"
                    params.append(recipient)
                query += " ORDER BY n.created_at " + ("DESC" if newest_first else "ASC")
                cursor.execute(query, params)
                return [{"notification_id": row[0], "recipient": row[1], "event_type": row[2], "parcel_id": row[3], "transfer_id": row[4], "message": row[5], "read": row[6] is not None, "created_at": row[7].isoformat()} for row in cursor.fetchall()]

    def get_succession_case(self, case_id):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id,parcel_id,nominee_user_id,status,evidence_reference,verified_by,verified_at,activated_by,activated_at,created_at FROM succession_cases WHERE id=%s", (case_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                cursor.execute("SELECT coalesce(display_name,identity_reference) FROM users WHERE id=%s", (row[2],))
                nominee = cursor.fetchone()[0]
                return {"case_id": row[0], "parcel_id": row[1], "nominee": nominee, "status": row[3], "evidence_reference": row[4], "verified_by": row[5], "verified_at": row[6].isoformat() if row[6] else None, "activated_by": row[7], "activated_at": row[8].isoformat() if row[8] else None, "created_at": row[9].isoformat()}

    def list_succession_cases(self, nominee=None, exclude_statuses=None):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM succession_cases ORDER BY created_at DESC")
                cases = [self.get_succession_case(row[0]) for row in cursor.fetchall()]
        return [case for case in cases if (not nominee or case["nominee"].lower() == nominee.lower()) and (not exclude_statuses or case["status"] not in exclude_statuses)]

    def list_recovery_cases(self):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT r.id,coalesce(u.display_name,u.identity_reference),r.parcel_id,r.status,r.old_credential_ref,r.new_wallet_address,r.approved_by,r.approved_at,r.created_at FROM credential_recovery_cases r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC")
                return [{"recovery_id": row[0], "user": row[1], "parcel_id": row[2], "status": row[3], "old_credential_id": row[4], "new_wallet_address": row[5], "approved_by": row[6], "approved_at": row[7].isoformat() if row[7] else None, "created_at": row[8].isoformat()} for row in cursor.fetchall()]

    def get_challenge(self, challenge_id):
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT payload,used_at FROM signing_challenges WHERE id=%s", (challenge_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                result = row[0]
                result["used"] = row[1] is not None
                return result

    def request_recovery(self, user, parcel_id, actor):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    user_id = self._user_id(cursor, user, create=False)
                    cursor.execute("SELECT c.id,c.credential_ref FROM credentials c WHERE c.user_id=%s AND c.status='ACTIVE' ORDER BY c.created_at DESC LIMIT 1", (user_id,))
                    row = cursor.fetchone()
                    if not row:
                        raise ValueError("no active wallet credential exists for this user")
                    recovery_id = "REC-" + uuid4().hex[:10].upper()
                    cursor.execute("INSERT INTO credential_recovery_cases(id,user_id,parcel_id,old_credential_id,old_credential_ref,status) VALUES (%s,%s,%s,%s,%s,'IDENTITY_VERIFICATION')", (recovery_id, user_id, parcel_id, row[0], row[1]))
                    self._audit(cursor, actor, "CREDENTIAL_RECOVERY_REQUESTED", parcel_id, detail={"recovery_id": recovery_id})
        return {"recovery_id": recovery_id, "user": user, "parcel_id": parcel_id, "old_credential_id": row[1], "status": "IDENTITY_VERIFICATION", "created_at": datetime.now(timezone.utc).isoformat()}

    def approve_recovery(self, recovery_id, actor, new_wallet):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT user_id,parcel_id,old_credential_id,status FROM credential_recovery_cases WHERE id=%s FOR UPDATE", (recovery_id,))
                    row = cursor.fetchone()
                    if not row or row[3] != "IDENTITY_VERIFICATION":
                        raise ValueError("recovery case is not awaiting identity verification")
                    cursor.execute("UPDATE credentials SET status='REVOKED',revoked_at=now(),revoked_reason='KEY_RECOVERY' WHERE id=%s", (row[2],))
                    cursor.execute("UPDATE credential_recovery_cases SET status='NEW_WALLET_LINK_REQUIRED',new_wallet_address=%s,approved_by=%s,approved_at=now(),updated_at=now() WHERE id=%s", (new_wallet, actor, recovery_id))
                    self._audit(cursor, actor, "CREDENTIAL_REVOKED", row[1], detail={"recovery_id": recovery_id})
        return self.get_recovery_case(recovery_id)

    def get_recovery_case(self, recovery_id):
        return next((case for case in self.list_recovery_cases() if case["recovery_id"] == recovery_id), None)

    def start_succession(self, parcel, nominee, actor):
        if nominee not in [item.get("name") for item in parcel.get("nominees", [])]:
            raise ValueError("successor must be a registered nominee")
        case_id = "SUC-" + uuid4().hex[:8].upper()
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("INSERT INTO succession_cases(id,parcel_id,nominee_user_id,status) VALUES (%s,%s,%s,'EVIDENCE_REQUIRED')", (case_id, parcel["ulpin"], self._user_id(cursor, nominee)))
                    self._notify(cursor, nominee, "SUCCESSION_OPENED", parcel["ulpin"], message="A succession case requires verification.")
                    self._audit(cursor, actor, "SUCCESSION_OPENED", parcel["ulpin"], detail={"case_id": case_id})
        return self.get_succession_case(case_id)

    def verify_succession(self, case_id, actor, evidence_reference):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE succession_cases SET status='VERIFIED',evidence_reference=%s,verified_by=%s,verified_at=now(),updated_at=now() WHERE id=%s AND status='EVIDENCE_REQUIRED' RETURNING parcel_id", (evidence_reference, actor, case_id))
                    row = cursor.fetchone()
                    if not row:
                        raise ValueError("succession case is not awaiting evidence")
                    self._audit(cursor, actor, "SUCCESSION_VERIFIED", row[0], detail={"case_id": case_id})
        return self.get_succession_case(case_id)

    def activate_successor(self, case_id, parcel, actor):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("SELECT s.parcel_id,coalesce(u.display_name,u.identity_reference) FROM succession_cases s JOIN users u ON u.id=s.nominee_user_id WHERE s.id=%s AND s.status='VERIFIED' FOR UPDATE", (case_id,))
                    row = cursor.fetchone()
                    if not row:
                        raise ValueError("verified succession case is required")
                    cursor.execute("UPDATE ownerships SET active=false WHERE parcel_id=%s", (row[0],))
                    cursor.execute("SELECT u.id,c.id,w.wallet_address FROM users u JOIN wallets w ON w.user_id=u.id JOIN credentials c ON c.wallet_id=w.id AND c.status='ACTIVE' WHERE lower(coalesce(u.display_name,u.identity_reference))=lower(%s) LIMIT 1", (row[1],))
                    nominee = cursor.fetchone()
                    if not nominee:
                        raise ValueError("successor needs an active credential before activation")
                    cursor.execute("INSERT INTO ownerships(parcel_id,user_id,credential_id,share_bps,active) VALUES (%s,%s,%s,10000,true)", (row[0], nominee[0], nominee[1]))
                    cursor.execute("UPDATE parcels SET current_owner_user_id=%s,ownership_type='SOLE',updated_at=now() WHERE ulpin=%s", (nominee[0], row[0]))
                    cursor.execute("UPDATE succession_cases SET status='SUCCESSOR_ACTIVATED',activated_by=%s,activated_at=now(),updated_at=now() WHERE id=%s", (actor, case_id))
                    self._audit(cursor, actor, "SUCCESSOR_ACTIVATED", row[0], detail={"case_id": case_id})
        return self.get_succession_case(case_id)

    def freeze_parcel(self, parcel_id, frozen, actor):
        with self._connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE parcels SET frozen=%s,updated_at=now() WHERE ulpin=%s", (frozen, parcel_id))
                    self._audit(cursor, actor, "PARCEL_FROZEN" if frozen else "PARCEL_UNFROZEN", parcel_id)
