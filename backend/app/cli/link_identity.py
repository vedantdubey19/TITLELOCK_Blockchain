"""Operator-only identity approval after checking evidence outside the application.

Run from backend: .venv/bin/python -m app.cli.link_identity REQUEST_UUID --evidence CHECK_REFERENCE
Requires database operator credentials; no public approval endpoint is exposed.
"""
import argparse
from uuid import UUID

from ..auth.repository import AuthRepository
from ..config import get_settings


def review(repository, request_id, evidence, decision='APPROVED'):
    evidence=evidence.strip()
    if decision not in ('APPROVED','REJECTED') or not 5 <= len(evidence) <= 500:
        raise ValueError('A decision and meaningful evidence reference are required')
    with repository.connect() as conn:
        row = conn.execute('''SELECT r.*,u.account_status,a.role FROM identity_link_requests r
            JOIN users u ON u.id=r.account_user_id JOIN auth_accounts a ON a.user_id=r.account_user_id WHERE r.id=%s FOR UPDATE OF r,u,a''', (request_id,)).fetchone()
        if not row or row['status'] != 'PENDING' or row['account_status'] != 'ACTIVE' or row['role'] != 'CITIZEN':
            raise ValueError('An active account and pending request are required')
        target=conn.execute('SELECT id FROM users WHERE id=%s FOR UPDATE',(row['registry_user_id'],)).fetchone()
        if decision=='APPROVED':
            if not target or conn.execute('SELECT 1 FROM auth_accounts WHERE user_id=%s',(row['registry_user_id'],)).fetchone():
                raise ValueError('Only an existing registry identity without a login can be linked')
            conn.execute('''INSERT INTO account_identity_links(account_user_id,registry_user_id,request_id)
                VALUES (%s,%s,%s)''', (row['account_user_id'], row['registry_user_id'], request_id))
        conn.execute("UPDATE identity_link_requests SET status=%s,review_note=%s,reviewed_by_operator=current_user,reviewed_at=now() WHERE id=%s",
                     (decision,'Operator evidence check: ' + evidence, request_id))


def approve(repository, request_id, evidence):
    review(repository,request_id,evidence)



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('request_id', nargs='?', type=UUID)
    parser.add_argument('--list', action='store_true', help='List pending identity claims')
    parser.add_argument('--reject', action='store_true')
    parser.add_argument('--evidence', help='Reference for the completed identity evidence check')
    args = parser.parse_args()
    repository=AuthRepository(get_settings().database_url)
    if args.list:
        with repository.connect() as conn:
            for row in conn.execute("SELECT id,account_user_id,registry_user_id,evidence_reference,created_at FROM identity_link_requests WHERE status='PENDING' ORDER BY created_at LIMIT 100"):
                print(dict(row))
        raise SystemExit(0)
    if not args.request_id or not args.evidence or len(args.evidence.strip()) < 5:
        parser.error('Provide a meaningful evidence check reference')
    review(repository,args.request_id,args.evidence,'REJECTED' if args.reject else 'APPROVED')
    print('Identity review saved. Ownership records were not changed.')
