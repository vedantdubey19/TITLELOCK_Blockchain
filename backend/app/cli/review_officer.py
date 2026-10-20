"""Database-operator review of officer evidence; no public approval endpoint.

python -m app.cli.review_officer list
python -m app.cli.review_officer approve USERNAME --evidence OFFICE-REVIEW-REFERENCE
Officer IDs are entered privately at the prompt, never as command-line arguments.
"""
import argparse
import getpass
import hmac

from ..auth.identity import officer_fingerprint, officer_suffix
from ..auth.repository import AuthRepository
from ..config import get_settings


def review(repository, username, decision, evidence, secret, officer_id=None):
    evidence = evidence.strip()
    if decision not in ('APPROVED','REJECTED','REVOKED') or not 5 <= len(evidence) <= 500:
        raise ValueError('A review decision and meaningful evidence reference are required')
    digest = officer_fingerprint(secret,officer_id) if decision=='APPROVED' else None
    with repository.connect() as conn:
        account = conn.execute('''SELECT a.*,u.account_status FROM auth_accounts a JOIN users u ON u.id=a.user_id
            WHERE a.username=%s AND a.role='REGISTRAR' FOR UPDATE OF a,u''',(username.strip().lower(),)).fetchone()
        if not account or account['account_status']!='ACTIVE':
            raise ValueError('An active registrar account is required')
        if digest and account['officer_id_hash'] and not hmac.compare_digest(digest,account['officer_id_hash']):
            raise ValueError('Reviewed officer ID does not match the submitted identity')
        if decision=='APPROVED':
            conn.execute('''UPDATE auth_accounts SET officer_id_hash=%s,officer_id_last4=%s,
                officer_verified_at=now(),officer_evidence_reference=%s WHERE user_id=%s''',
                (digest,officer_suffix(officer_id),evidence,account['user_id']))
        else:
            conn.execute('UPDATE auth_accounts SET officer_verified_at=NULL,officer_evidence_reference=%s WHERE user_id=%s',
                         (evidence,account['user_id']))
        conn.execute('DELETE FROM auth_sessions WHERE user_id=%s',(account['user_id'],))
        conn.execute('UPDATE login_challenges SET consumed=true WHERE user_id=%s',(account['user_id'],))
        conn.execute('INSERT INTO account_review_events(account_user_id,decision,evidence_reference) VALUES (%s,%s,%s)',
                     (account['user_id'],decision,evidence))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['list','approve','reject','revoke'])
    parser.add_argument('username',nargs='?')
    parser.add_argument('--evidence')
    args=parser.parse_args();settings=get_settings();repository=AuthRepository(settings.database_url)
    if args.action=='list':
        with repository.connect() as conn:
            for row in conn.execute("SELECT username,jurisdiction,officer_id_last4,officer_verified_at FROM auth_accounts WHERE role='REGISTRAR' ORDER BY username"):
                print(dict(row))
        return
    if not args.username or not args.evidence:
        parser.error('Username and --evidence are required')
    officer_id=getpass.getpass('Officer ID checked against original evidence: ') if args.action=='approve' else None
    review(repository,args.username,{'approve':'APPROVED','reject':'REJECTED','revoke':'REVOKED'}[args.action],args.evidence,settings.secret_key,officer_id)
    print('Officer review saved; previous login sessions were revoked. Sign in again after approval.')


if __name__=='__main__':
    main()
