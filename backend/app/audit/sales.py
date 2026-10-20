"""Sale activity is written in the transaction that performs the action. No keys are logged."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..auth.routes import check_origin, current_user, get_repository

router = APIRouter(prefix='/api', tags=['sale activity'], dependencies=[Depends(check_origin)])


def record_event(conn, sale_id, action, actor_id=None, reason=None):
    # Callers hold the sale/parcel lock, giving each deal a stable event order.
    event = conn.execute('INSERT INTO sale_events(sale_id,action,actor_user_id,reason) VALUES (%s,%s,%s,%s) RETURNING id',
                         (sale_id, action, actor_id, reason)).fetchone()
    conn.execute('''INSERT INTO sale_notifications(event_id,user_id)
        SELECT %s,user_id FROM (
            SELECT buyer_user_id AS user_id FROM sale_requests WHERE id=%s
            UNION SELECT registrar_user_id FROM sale_requests WHERE id=%s
            UNION SELECT a.user_id FROM auth_accounts a JOIN sale_owner_approvals o ON o.registry_user_id=a.user_id WHERE o.request_id=%s
            UNION SELECT l.account_user_id FROM account_identity_links l JOIN sale_owner_approvals o
                ON o.registry_user_id=l.registry_user_id WHERE o.request_id=%s
        ) recipients ON CONFLICT DO NOTHING''', (event['id'],sale_id,sale_id,sale_id,sale_id))


def can_view(conn, sale_id, account_id):
    return conn.execute('''SELECT s.id FROM sale_requests s WHERE s.id=%s AND
        (s.buyer_user_id=%s OR s.registrar_user_id=%s OR EXISTS (
            SELECT 1 FROM sale_owner_approvals a WHERE a.request_id=s.id AND
                (a.registry_user_id=%s OR a.registry_user_id IN (
                    SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))))''',
        (sale_id,account_id,account_id,account_id,account_id)).fetchone()


@router.get('/sales/{sale_id}/events')
def sale_events(sale_id: UUID, response: Response, limit: int = Query(50,ge=1,le=100),
                before_id: int | None = Query(None,ge=1), user=Depends(current_user), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    with repository.connect() as conn:
        if not can_view(conn,sale_id,user.id):
            raise HTTPException(404, 'Sale request unavailable')
        return conn.execute('''SELECT e.id,e.action,e.reason,e.created_at,a.username AS actor_username
            FROM sale_events e LEFT JOIN auth_accounts a ON a.user_id=e.actor_user_id
            WHERE e.sale_id=%s AND (%s::bigint IS NULL OR e.id<%s) ORDER BY e.id DESC LIMIT %s''',
            (sale_id,before_id,before_id,limit)).fetchall()


@router.get('/notifications')
def notifications(response: Response, unread_only: bool = False, limit: int = Query(50,ge=1,le=100),
                  before_id: int | None = Query(None,ge=1), user=Depends(current_user), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    with repository.connect() as conn:
        return conn.execute('''SELECT n.event_id,n.read_at,e.sale_id,e.action,e.reason,e.created_at,s.parcel_id,s.buyer_name,s.buyer_phone
            FROM sale_notifications n JOIN sale_events e ON e.id=n.event_id JOIN sale_requests s ON s.id=e.sale_id
            WHERE n.user_id=%s AND (NOT %s OR n.read_at IS NULL)
                AND (%s::bigint IS NULL OR n.event_id<%s) ORDER BY n.event_id DESC LIMIT %s''',
            (user.id,unread_only,before_id,before_id,limit)).fetchall()


@router.post('/notifications/{event_id}/read')
def read_notification(event_id: int, response: Response, user=Depends(current_user), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    with repository.connect() as conn:
        row = conn.execute('''UPDATE sale_notifications SET read_at=COALESCE(read_at,clock_timestamp())
            WHERE event_id=%s AND user_id=%s RETURNING event_id,read_at''', (event_id,user.id)).fetchone()
    if not row:
        raise HTTPException(404, 'Notification unavailable')
    return row
