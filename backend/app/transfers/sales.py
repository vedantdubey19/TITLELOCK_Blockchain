"""Two-party, single-use sale approvals. Raw keys exist only in responses and memory."""
import hashlib
import hmac
import secrets
import logging
from functools import wraps

import psycopg
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, SecretStr
from psycopg.types.json import Jsonb

from ..auth.routes import check_origin, current_user, get_repository, require_role
from ..audit.sales import record_event, can_view

router = APIRouter(prefix='/api/sales', tags=['sales'], dependencies=[Depends(check_origin)])


class SaleRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    parcel_id: str = Field(min_length=1, max_length=150)
    buyer_username: str = Field(min_length=3, max_length=64)
    document_hash: str = Field(min_length=8, max_length=200)


class KeyProof(BaseModel):
    model_config = ConfigDict(extra='forbid')
    key: SecretStr = Field(min_length=40, max_length=100)


def private_response(response: Response):
    response.headers['Cache-Control'] = 'no-store'


def fingerprint(request, sale_id, actor, raw):
    secret = request.app.state.settings.sale_token_secret.get_secret_value()
    if not secret:
        raise HTTPException(503, 'Sale key secret is not configured')
    return hmac.new(secret.encode(), f'sale:{sale_id}:{actor}:{raw}'.encode(), hashlib.sha256).hexdigest()


def expire_sales(repository):
    # Called by the worker AND before requests: downtime cannot bypass a cooldown.
    with repository.connect() as conn:
        parcels = conn.execute("SELECT DISTINCT parcel_id FROM sale_requests WHERE status='PENDING' AND expires_at<=clock_timestamp() ORDER BY parcel_id").fetchall()
        for parcel in parcels:
            conn.execute('SELECT parcel_id FROM sale_parcel_state WHERE parcel_id=%s FOR UPDATE', (parcel['parcel_id'],))
            expired = conn.execute("""UPDATE sale_requests SET status='EXPIRED',registrar_key_hash=NULL
                WHERE parcel_id=%s AND status='PENDING' AND expires_at<=clock_timestamp() RETURNING id,expires_at""", (parcel['parcel_id'],)).fetchone()
            if expired:
                conn.execute("UPDATE sale_parcel_state SET cooldown_until=%s + interval '7 days' WHERE parcel_id=%s", (expired['expires_at'],parcel['parcel_id']))
                conn.execute('UPDATE sale_owner_approvals SET key_hash=NULL WHERE request_id=%s', (expired['id'],))
                record_event(conn,expired['id'],'SALE_EXPIRED')


def lock_sale(conn, sale_id):
    sale = conn.execute('SELECT parcel_id FROM sale_requests WHERE id=%s', (sale_id,)).fetchone()
    if not sale:
        raise HTTPException(404, 'Sale request unavailable')
    conn.execute('SELECT parcel_id FROM sale_parcel_state WHERE parcel_id=%s FOR UPDATE', (sale['parcel_id'],))
    sale = conn.execute("SELECT *, expires_at IS NULL OR expires_at>clock_timestamp() AS valid FROM sale_requests WHERE id=%s FOR UPDATE", (sale_id,)).fetchone()
    if sale['status'] != 'PENDING' or not sale['valid']:
        raise HTTPException(409, 'Sale request is completed or expired')
    parcel = conn.execute('SELECT * FROM parcels WHERE ulpin=%s FOR UPDATE', (sale['parcel_id'],)).fetchone()
    if not parcel or parcel['frozen'] or parcel['title_status'] not in ('VERIFIED','VERIFIED_WITH_ENCUMBRANCE'):
        raise HTTPException(409, 'Property is frozen or restricted')
    owners = conn.execute('SELECT user_id,share_bps FROM ownerships WHERE parcel_id=%s AND active ORDER BY user_id FOR UPDATE', (sale['parcel_id'],)).fetchall()
    expected = conn.execute('SELECT registry_user_id,share_bps FROM sale_owner_approvals WHERE request_id=%s ORDER BY registry_user_id', (sale_id,)).fetchall()
    if [(r['user_id'],r['share_bps']) for r in owners] != [(r['registry_user_id'],r['share_bps']) for r in expected]:
        raise HTTPException(409, 'Ownership changed; this request cannot proceed')
    return sale


def owner_identity(conn, sale_id, account_id):
    owners = conn.execute('''SELECT a.* FROM sale_owner_approvals a WHERE request_id=%s
        AND (registry_user_id=%s OR registry_user_id IN
            (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))''',
        (sale_id,account_id,account_id)).fetchall()
    if not owners:
        raise HTTPException(403, 'Only a current owner can approve this request')
    return owners


@router.post('', status_code=201)
def create_sale(data: SaleRequest, response: Response, user=Depends(require_role('REGISTRAR')), repository=Depends(get_repository)):
    private_response(response)
    expire_sales(repository)
    with repository.connect() as conn:
        conn.execute('INSERT INTO sale_parcel_state(parcel_id) VALUES (%s) ON CONFLICT DO NOTHING', (data.parcel_id,))
        state = conn.execute('SELECT cooldown_until>clock_timestamp() AS blocked FROM sale_parcel_state WHERE parcel_id=%s FOR UPDATE', (data.parcel_id,)).fetchone()
        if state['blocked']:
            raise HTTPException(409, 'Property is in its seven-day sale cooldown')
        parcel = conn.execute('SELECT frozen,title_status FROM parcels WHERE ulpin=%s FOR UPDATE', (data.parcel_id,)).fetchone()
        if not parcel:
            raise HTTPException(404, 'Property unavailable')
        if parcel['frozen'] or parcel['title_status'] not in ('VERIFIED','VERIFIED_WITH_ENCUMBRANCE'):
            raise HTTPException(409, 'Property is frozen or restricted')
        if conn.execute("SELECT id FROM sale_requests WHERE parcel_id=%s AND status='PENDING'", (data.parcel_id,)).fetchone():
            raise HTTPException(409, 'A pending deal already exists')
        buyer = conn.execute("""SELECT a.user_id FROM auth_accounts a JOIN users u ON u.id=a.user_id
            WHERE lower(a.username)=lower(%s) AND a.role='CITIZEN' AND u.account_status='ACTIVE'""", (data.buyer_username,)).fetchone()
        if not buyer:
            raise HTTPException(404, 'Active citizen buyer unavailable')
        owners = conn.execute('SELECT user_id,share_bps FROM ownerships WHERE parcel_id=%s AND active ORDER BY user_id FOR UPDATE', (data.parcel_id,)).fetchall()
        if not owners or sum(o['share_bps'] for o in owners) != 10000:
            raise HTTPException(409, 'Complete ownership shares are required')
        identities = [o['user_id'] for o in owners]
        if buyer['user_id'] in identities or conn.execute('SELECT 1 FROM account_identity_links WHERE account_user_id=%s AND registry_user_id=ANY(%s)', (buyer['user_id'],identities)).fetchone():
            raise HTTPException(409, 'Buyer is already an owner')
        sale = conn.execute('''INSERT INTO sale_requests(parcel_id,buyer_user_id,registrar_user_id,document_hash)
            VALUES (%s,%s,%s,%s) RETURNING id,status''', (data.parcel_id,buyer['user_id'],user.id,data.document_hash)).fetchone()
        for owner in owners:
            conn.execute('INSERT INTO sale_owner_approvals(request_id,registry_user_id,share_bps) VALUES (%s,%s,%s)', (sale['id'],owner['user_id'],owner['share_bps']))
        record_event(conn,sale['id'],'SALE_REQUESTED',user.id)
    return sale


@router.get('')
def list_sales(response: Response, user=Depends(current_user), repository=Depends(get_repository)):
    private_response(response)
    expire_sales(repository)
    with repository.connect() as conn:
        return conn.execute('''SELECT s.id,s.parcel_id,s.status,s.expires_at,s.created_at,s.completed_at,s.registrar_approved,
                (SELECT max(e.created_at) FROM sale_events e WHERE e.sale_id=s.id AND e.action='TRANSFER_FAILED') AS last_failure_at,
                (SELECT e.reason FROM sale_events e WHERE e.sale_id=s.id AND e.action='TRANSFER_FAILED' ORDER BY e.id DESC LIMIT 1) AS last_failure_reason,
                s.registrar_key_hash IS NOT NULL AS registrar_key_generated,
                b.username AS buyer_username,r.username AS registrar_username,ps.cooldown_until,
                (SELECT count(*) FROM sale_owner_approvals a WHERE a.request_id=s.id) AS required_owners,
                (SELECT count(*) FROM sale_owner_approvals a WHERE a.request_id=s.id AND a.approved) AS approved_owners,
                EXISTS(SELECT 1 FROM sale_owner_approvals a WHERE a.request_id=s.id AND a.key_hash IS NOT NULL
                    AND (a.registry_user_id=%s OR a.registry_user_id IN
                        (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))) AS owner_key_generated,
                EXISTS(SELECT 1 FROM sale_owner_approvals a WHERE a.request_id=s.id AND a.approved_by=%s AND a.approved) AS owner_approved,
                EXISTS(SELECT 1 FROM sale_owner_approvals a WHERE a.request_id=s.id AND
                    (a.registry_user_id=%s OR a.registry_user_id IN
                        (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))) AS is_owner
            FROM sale_requests s JOIN auth_accounts b ON b.user_id=s.buyer_user_id
            JOIN auth_accounts r ON r.user_id=s.registrar_user_id JOIN sale_parcel_state ps ON ps.parcel_id=s.parcel_id
            WHERE s.registrar_user_id=%s OR s.buyer_user_id=%s OR EXISTS
                (SELECT 1 FROM sale_owner_approvals a WHERE a.request_id=s.id AND
                    (a.registry_user_id=%s OR a.registry_user_id IN
                        (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s)))
            ORDER BY s.created_at DESC''', (user.id,)*9).fetchall()


@router.post('/{sale_id}/keys/{side}')
def generate_key(sale_id: UUID, side: str, request: Request, response: Response, user=Depends(current_user), repository=Depends(get_repository)):
    private_response(response)
    if side not in ('owner','registrar'):
        raise HTTPException(404, 'Unknown key type')
    expire_sales(repository)
    raw = secrets.token_urlsafe(32)
    digest = fingerprint(request,sale_id,f'{side}:{user.id}',raw)
    with repository.connect() as conn:
        sale = lock_sale(conn,sale_id)
        if side == 'registrar':
            if user.role != 'REGISTRAR' or str(sale['registrar_user_id']) != user.id:
                raise HTTPException(403, 'Only the assigned registrar can generate this key')
            if sale['registrar_key_hash'] or sale['registrar_approved']:
                raise HTTPException(409, 'Registrar key was already issued')
            conn.execute('UPDATE sale_requests SET registrar_key_hash=%s WHERE id=%s', (digest,sale_id))
        else:
            if user.role != 'CITIZEN':
                raise HTTPException(403, 'Citizen owner required')
            owners = owner_identity(conn,sale_id,user.id)
            if any(o['key_hash'] or o['approved'] for o in owners):
                raise HTTPException(409, 'Owner key was already issued')
            for owner in owners:
                conn.execute('UPDATE sale_owner_approvals SET key_hash=%s,approved_by=%s WHERE request_id=%s AND registry_user_id=%s', (digest,user.id,sale_id,owner['registry_user_id']))
            conn.execute("UPDATE sale_requests SET expires_at=COALESCE(expires_at,clock_timestamp()+interval '24 hours') WHERE id=%s", (sale_id,))
        record_event(conn,sale_id,side.upper()+'_KEY_ISSUED',user.id)
        deadline = conn.execute('SELECT expires_at FROM sale_requests WHERE id=%s', (sale_id,)).fetchone()['expires_at']
    return {'key':raw,'expires_at':deadline,'message':'Save this key now. It will not be shown again.'}


@router.post('/{sale_id}/approve/{side}')
def approve_key(sale_id: UUID, side: str, proof: KeyProof, request: Request, response: Response, user=Depends(current_user), repository=Depends(get_repository)):
    private_response(response)
    if side not in ('owner','registrar'):
        raise HTTPException(404, 'Unknown key type')
    expire_sales(repository)
    if not repository.allow_attempt(f'sale-proof:{sale_id}:{user.id}',5):
        raise HTTPException(429, 'Too many key attempts; retry in 15 minutes')
    digest = fingerprint(request,sale_id,f'{side}:{user.id}',proof.key.get_secret_value())
    with repository.connect() as conn:
        sale = lock_sale(conn,sale_id)
        if side == 'registrar':
            if user.role != 'REGISTRAR' or str(sale['registrar_user_id']) != user.id:
                raise HTTPException(403, 'Assigned registrar required')
            if sale['registrar_approved'] or not sale['registrar_key_hash'] or not hmac.compare_digest(digest,sale['registrar_key_hash']):
                raise HTTPException(401, 'Invalid or already used key')
            if sale['expires_at'] is None:
                raise HTTPException(409, 'Owner must generate a key first')
            conn.execute('UPDATE sale_requests SET registrar_approved=true,registrar_key_hash=NULL WHERE id=%s', (sale_id,))
        else:
            if user.role != 'CITIZEN':
                raise HTTPException(403, 'Citizen owner required')
            owners = owner_identity(conn,sale_id,user.id)
            if any(o['approved'] or str(o['approved_by']) != user.id or not o['key_hash'] or not hmac.compare_digest(digest,o['key_hash']) for o in owners):
                raise HTTPException(401, 'Invalid or already used key')
            conn.execute('UPDATE sale_owner_approvals SET approved=true,key_hash=NULL WHERE request_id=%s AND approved_by=%s', (sale_id,user.id))
        record_event(conn,sale_id,side.upper()+'_APPROVED',user.id)
        return {'status':'APPROVED','message':'Key accepted. Transfer still requires registrar completion.'}


def record_failed_transfer(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        try:
            return function(*args, **kwargs)
        except (HTTPException, psycopg.Error) as failure:
            repository, user, sale_id = kwargs['repository'], kwargs['user'], kwargs['sale_id']
            reason = failure.detail if isinstance(failure, HTTPException) else 'Database error; transfer was not completed'
            try:
                # The ownership transaction has already rolled back. Save the attempt separately.
                with repository.connect() as conn:
                    conn.execute('SELECT id FROM sale_requests WHERE id=%s FOR UPDATE', (sale_id,))
                    sale = conn.execute('SELECT registrar_user_id FROM sale_requests WHERE id=%s', (sale_id,)).fetchone()
                    if sale and str(sale['registrar_user_id']) == user.id and can_view(conn,sale_id,user.id):
                        record_event(conn,sale_id,'TRANSFER_FAILED',user.id,reason)
            except psycopg.Error:
                logging.getLogger(__name__).warning('Unable to persist failed transfer attempt')
            if isinstance(failure, psycopg.Error):
                raise HTTPException(503, 'Transfer could not be completed; please retry later') from None
            raise
    return wrapped


@router.post('/{sale_id}/complete')
@record_failed_transfer
def complete_sale(sale_id: UUID, response: Response, user=Depends(require_role('REGISTRAR')), repository=Depends(get_repository)):
    private_response(response)
    expire_sales(repository)
    with repository.connect() as conn:
        sale = lock_sale(conn,sale_id)
        if str(sale['registrar_user_id']) != user.id:
            raise HTTPException(403, 'Assigned registrar required')
        if not sale['registrar_approved'] or not sale['expires_at'] or conn.execute('SELECT 1 FROM sale_owner_approvals WHERE request_id=%s AND NOT approved', (sale_id,)).fetchone():
            raise HTTPException(409, 'Both registrar and every owner must approve within 24 hours')
        buyer = conn.execute("SELECT a.user_id,u.display_name,current_date AS transfer_date FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=%s AND a.role='CITIZEN' AND u.account_status='ACTIVE' FOR UPDATE OF a,u", (sale['buyer_user_id'],)).fetchone()
        if not buyer:
            raise HTTPException(409, 'Buyer account is unavailable')
        if not conn.execute('SELECT expires_at>clock_timestamp() AS valid FROM sale_requests WHERE id=%s', (sale_id,)).fetchone()['valid']:
            raise HTTPException(409, 'Sale window expired before completion')
        names = conn.execute('SELECT u.display_name FROM sale_owner_approvals a JOIN users u ON u.id=a.registry_user_id WHERE a.request_id=%s ORDER BY u.id', (sale_id,)).fetchall()
        conn.execute('UPDATE ownerships SET active=false WHERE parcel_id=%s AND active', (sale['parcel_id'],))
        conn.execute('INSERT INTO ownerships(parcel_id,user_id,share_bps,active) VALUES (%s,%s,10000,true)', (sale['parcel_id'],sale['buyer_user_id']))
        history = Jsonb([{'from':', '.join(o['display_name'] or 'Owner' for o in names),
                         'to':buyer['display_name'], 'date':str(buyer['transfer_date']),
                         'doc_hash':sale['document_hash'], 'sale_request_id':str(sale_id)}])
        conn.execute("""UPDATE parcels SET current_owner_user_id=%s,ownership_type='SOLE',last_registered_date=current_date,
            transfer_history=COALESCE(transfer_history,'[]'::jsonb)||%s,updated_at=now() WHERE ulpin=%s""", (sale['buyer_user_id'],history,sale['parcel_id']))
        conn.execute("UPDATE sale_requests SET status='COMPLETED',completed_at=now() WHERE id=%s", (sale_id,))
        record_event(conn,sale_id,'TRANSFER_COMPLETED',user.id)
    return {'status':'COMPLETED','message':'Database ownership transferred. No blockchain transaction was submitted.'}
