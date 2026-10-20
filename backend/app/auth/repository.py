import psycopg
import secrets
from psycopg.rows import dict_row


class AuthRepository:
    def __init__(self, database_url: str):
        self.database_url = database_url

    def connect(self):
        return psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=5)

    def create_user(self, data, password_hash, aadhaar_hash=None, aadhaar_last4=None, officer_hash=None, officer_last4=None):
        # Never link a new login to existing ownership by an unverified display name.
        with self.connect() as conn:
            user = conn.execute(
                "INSERT INTO users(identity_reference, display_name) VALUES (%s, %s) RETURNING id",
                ('account:' + data.username.lower(), data.name),
            ).fetchone()
            conn.execute(
                """INSERT INTO auth_accounts
                   (user_id, email, username, password_hash, role, phone, jurisdiction, description, aadhaar_hash, aadhaar_last4, officer_id_hash, officer_id_last4)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (user['id'], str(data.email).lower(), data.username.lower(), password_hash,
                 data.role, data.phone, data.jurisdiction, data.description, aadhaar_hash, aadhaar_last4, officer_hash, officer_last4),
            )
        return self.find_user(data.username)

    def find_user(self, identifier):
        with self.connect() as conn:
            return conn.execute(
                """SELECT a.*, u.display_name AS name, u.account_status AS status
                   FROM auth_accounts a JOIN users u ON u.id = a.user_id
                   WHERE lower(a.email) = %s OR lower(a.username) = %s""",
                (identifier.strip().lower(), identifier.strip().lower()),
            ).fetchone()

    def create_session(self, user_id, token_hash, ttl_hours, mfa_verified=False):
        with self.connect() as conn:
            conn.execute(
                """INSERT INTO auth_sessions(token_hash, user_id, expires_at, mfa_verified)
                   VALUES (%s, %s, now() + %s * interval '1 hour', %s)""",
                (token_hash, user_id, ttl_hours, mfa_verified),
            )

    def session_user(self, token_hash):
        with self.connect() as conn:
            return conn.execute(
                """SELECT a.*, u.display_name AS name, u.account_status AS status, s.mfa_verified
                   FROM auth_sessions s JOIN auth_accounts a ON a.user_id = s.user_id
                   JOIN users u ON u.id = a.user_id
                   WHERE s.token_hash = %s AND s.expires_at > now()""",
                (token_hash,),
            ).fetchone()

    def revoke_session(self, token_hash):
        with self.connect() as conn:
            conn.execute('DELETE FROM auth_sessions WHERE token_hash = %s', (token_hash,))

    def allow_attempt(self, key, limit):
        with self.connect() as conn:
            row = conn.execute(
                """INSERT INTO auth_rate_limits(key, attempts, resets_at)
                   VALUES (%s, 1, now() + interval '15 minutes')
                   ON CONFLICT (key) DO UPDATE SET
                     attempts = CASE WHEN auth_rate_limits.resets_at <= now()
                                     THEN 1 ELSE auth_rate_limits.attempts + 1 END,
                     resets_at = CASE WHEN auth_rate_limits.resets_at <= now()
                                      THEN EXCLUDED.resets_at ELSE auth_rate_limits.resets_at END
                   RETURNING attempts""",
                (key,),
            ).fetchone()
        return row['attempts'] <= limit

    def create_challenge(self, challenge_id, account, email_hash):
        with self.connect() as conn:
            conn.execute('SELECT user_id FROM auth_accounts WHERE user_id = %s FOR UPDATE', (account['user_id'],))
            conn.execute('UPDATE login_challenges SET consumed=true WHERE user_id=%s AND NOT consumed', (account['user_id'],))
            conn.execute('''INSERT INTO login_challenges(id, user_id, email, phone, email_code_hash)
                            VALUES (%s,%s,%s,%s,%s)''',
                         (challenge_id, account['user_id'], account['email'], account['phone'], email_hash))

    def mark_challenge_delivered(self, challenge_id, verification_sid):
        with self.connect() as conn:
            conn.execute('UPDATE login_challenges SET delivered=true, twilio_verification_sid=%s WHERE id=%s',
                         (verification_sid, challenge_id))

    def cancel_challenge(self, challenge_id):
        with self.connect() as conn:
            conn.execute('UPDATE login_challenges SET consumed=true WHERE id=%s', (challenge_id,))

    def verify_challenge(self, challenge_id, email_hash, sms_code, sender):
        # Lock before checking so two concurrent requests cannot use the same proof.
        with self.connect() as conn:
            challenge = conn.execute('''SELECT c.*, a.email AS current_email, a.phone AS current_phone,
                    u.account_status, c.expires_at > now() AS unexpired
                FROM login_challenges c JOIN auth_accounts a ON a.user_id=c.user_id
                JOIN users u ON u.id=c.user_id WHERE c.id=%s FOR UPDATE OF c, a, u''', (challenge_id,)).fetchone()
            if not challenge or challenge['consumed'] or not challenge['delivered'] or not challenge['unexpired'] or challenge['attempts'] >= 5:
                return None
            if challenge['account_status'] != 'ACTIVE' or challenge['current_email'] != challenge['email'] or challenge['current_phone'] != challenge['phone']:
                return None
            conn.execute('UPDATE login_challenges SET attempts=attempts+1 WHERE id=%s', (challenge_id,))
            if not secrets.compare_digest(email_hash, challenge['email_code_hash']):
                return None
            if not sender.verify_sms(challenge['twilio_verification_sid'], sms_code):
                return None
            conn.execute('UPDATE login_challenges SET consumed=true WHERE id=%s', (challenge_id,))
            conn.execute('UPDATE auth_accounts SET email_verified_at=now(), phone_verified_at=now() WHERE user_id=%s', (challenge['user_id'],))
        return self.find_user(challenge['email'])
