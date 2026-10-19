from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from ..auth.routes import check_origin, get_repository, require_role

router = APIRouter(prefix='/api/properties', tags=['properties'], dependencies=[Depends(check_origin)])


class LinkRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    registry_user_id: UUID
    evidence_reference: str = Field(min_length=5, max_length=500)


@router.post('/identity-link', status_code=201)
def request_link(data: LinkRequest, user=Depends(require_role('CITIZEN')), repository=Depends(get_repository)):
    # This records a claim only. An operator must check evidence before linking.
    with repository.connect() as conn:
        existing = conn.execute('SELECT id FROM users WHERE id=%s AND NOT EXISTS '
                                '(SELECT 1 FROM auth_accounts WHERE user_id=users.id)',
                                (data.registry_user_id,)).fetchone()
        if not existing:
            raise HTTPException(404, 'Registry identity unavailable')
        row = conn.execute('''INSERT INTO identity_link_requests(account_user_id,registry_user_id,evidence_reference)
            VALUES (%s,%s,%s) ON CONFLICT (account_user_id,registry_user_id) WHERE status='PENDING'
            DO UPDATE SET evidence_reference=EXCLUDED.evidence_reference RETURNING id,status''',
            (user.id, data.registry_user_id, data.evidence_reference.strip())).fetchone()
        return row


@router.get('/my')
def my_properties(response: Response, user=Depends(require_role('CITIZEN')), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    with repository.connect() as conn:
        linked = conn.execute('SELECT EXISTS(SELECT 1 FROM account_identity_links WHERE account_user_id=%s) AS linked',
                              (user.id,)).fetchone()['linked']
        rows = conn.execute('''SELECT p.ulpin, p.ownership_type, p.frozen, p.survey_number, p.area_sqm,
                p.registration_office, p.last_registered_date, p.title_status, p.risk_status,
                p.transfer_history, u.display_name AS current_owner
            FROM parcels p LEFT JOIN users u ON u.id=p.current_owner_user_id
            WHERE EXISTS (SELECT 1 FROM ownerships o WHERE o.parcel_id=p.ulpin AND o.active
                AND (o.user_id=%s OR o.user_id IN
                    (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s)))
            ORDER BY p.ulpin''', (user.id, user.id)).fetchall()
    return {'properties': rows, 'identity_linked': linked}


@router.get('/identity-link')
def link_status(response: Response, user=Depends(require_role('CITIZEN')), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    with repository.connect() as conn:
        return conn.execute('''SELECT id,registry_user_id,status,review_note,created_at,reviewed_at
            FROM identity_link_requests WHERE account_user_id=%s ORDER BY created_at DESC''', (user.id,)).fetchall()


@router.get('/{ulpin}', responses={404: {'description': 'Property unavailable or not owned by this account'}})
def property_details(ulpin: str, response: Response, user=Depends(require_role('CITIZEN')), repository=Depends(get_repository)):
    response.headers['Cache-Control'] = 'no-store'
    # Ownership and details are read in one statement, including for co-owners.
    with repository.connect() as conn:
        row = conn.execute('''SELECT p.ulpin,p.survey_number,p.area_sqm,p.registration_office,
                p.last_registered_date,p.ownership_type,p.title_status,p.risk_status,p.frozen,p.freeze_reason,
                p.transfer_history,u.display_name AS current_owner,
                COALESCE((SELECT jsonb_agg(jsonb_build_object('name',cu.display_name,'share_bps',o.share_bps)
                    ORDER BY o.id) FROM ownerships o JOIN users cu ON cu.id=o.user_id
                    WHERE o.parcel_id=p.ulpin AND o.active), '[]'::jsonb) AS owners,
                COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'status',e.status,'details',e.details)
                    ORDER BY e.created_at,e.id) FROM encumbrances e WHERE e.parcel_id=p.ulpin), '[]'::jsonb) AS encumbrances,
                COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'status',d.status,'details',d.details)
                    ORDER BY d.created_at,d.id) FROM disputes d WHERE d.parcel_id=p.ulpin), '[]'::jsonb) AS disputes
            FROM parcels p LEFT JOIN users u ON u.id=p.current_owner_user_id
            WHERE p.ulpin=%s AND EXISTS (SELECT 1 FROM ownerships own WHERE own.parcel_id=p.ulpin AND own.active
                AND (own.user_id=%s OR own.user_id IN
                    (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s)))''',
            (ulpin, user.id, user.id)).fetchone()
    if not row:
        raise HTTPException(404, 'Property unavailable or not owned by this account')
    return row
