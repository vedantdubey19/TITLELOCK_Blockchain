"""Operator-only identity approval after checking evidence outside the application.

Run from backend: .venv/bin/python -m app.cli.link_identity REQUEST_UUID --evidence CHECK_REFERENCE
Requires database operator credentials; no public approval endpoint is exposed.
"""
import argparse
from uuid import UUID

from ..auth.repository import AuthRepository
from ..config import get_settings


def approve(repository, request_id, evidence):
    with repository.connect() as conn:
        row = conn.execute('''SELECT r.*,u.account_status FROM identity_link_requests r
            JOIN users u ON u.id=r.account_user_id WHERE r.id=%s FOR UPDATE OF r,u''', (request_id,)).fetchone()
        if not row or row['status'] != 'PENDING' or row['account_status'] != 'ACTIVE':
            raise ValueError('An active account and pending request are required')
        conn.execute('''INSERT INTO account_identity_links(account_user_id,registry_user_id,request_id)
            VALUES (%s,%s,%s)''', (row['account_user_id'], row['registry_user_id'], request_id))
        conn.execute("UPDATE identity_link_requests SET status='APPROVED',review_note=%s,reviewed_at=now() WHERE id=%s",
                     ('Operator evidence check: ' + evidence, request_id))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('request_id', type=UUID)
    parser.add_argument('--evidence', required=True, help='Reference for the completed identity evidence check')
    args = parser.parse_args()
    if len(args.evidence.strip()) < 5:
        parser.error('Provide a meaningful evidence check reference')
    approve(AuthRepository(get_settings().database_url), args.request_id, args.evidence.strip())
    print('Identity link approved. Ownership records were not changed.')
