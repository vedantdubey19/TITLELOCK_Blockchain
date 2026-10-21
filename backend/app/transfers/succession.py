"""Succession claims and evidence review only; never mutate ownership or submit chain transactions."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field
from psycopg.types.json import Jsonb

from ..auth.routes import check_origin, current_user, get_repository, require_role
from ..fraud.service import lock_parcel

router=APIRouter(prefix='/api/succession',tags=['succession review'],dependencies=[Depends(check_origin)])


class Heir(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    username: str=Field(min_length=3,max_length=64)
    share_bps: int=Field(gt=0,le=10000,strict=True)


class SuccessionClaim(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    parcel_id: str=Field(min_length=1,max_length=150)
    deceased_user_id: UUID
    heirs: list[Heir]=Field(min_length=1,max_length=20)
    death_certificate_reference: str=Field(min_length=5,max_length=500)
    legal_heir_reference: str=Field(min_length=5,max_length=500)
    document_hash: str=Field(pattern=r'^[a-fA-F0-9]{64}$')


class CaseReview(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    decision: Literal['EVIDENCE_VERIFIED','REJECTED']
    evidence_reference: str=Field(min_length=5,max_length=500)
    note: str=Field(min_length=5,max_length=500)


def snapshot(conn,parcel_id):
    rows=conn.execute('SELECT user_id,share_bps FROM ownerships WHERE parcel_id=%s AND active ORDER BY user_id FOR UPDATE',(parcel_id,)).fetchall()
    parcel=conn.execute('SELECT current_owner_user_id FROM parcels WHERE ulpin=%s',(parcel_id,)).fetchone()
    if not rows or sum(row['share_bps'] for row in rows)!=10000 or any(row['share_bps']<=0 for row in rows) or not parcel or parcel['current_owner_user_id'] not in [row['user_id'] for row in rows]:
        raise HTTPException(409,'Complete, consistent current ownership is required for succession review')
    return [[str(row['user_id']),row['share_bps']] for row in rows]


def can_view(conn,case_id,user):
    return conn.execute('''SELECT c.* FROM succession_cases c WHERE c.id=%s AND
        (%s='REGISTRAR' OR c.applicant_user_id=%s OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.heirs) h WHERE h->>'user_id'=%s)
        OR EXISTS(SELECT 1 FROM ownerships o WHERE o.parcel_id=c.parcel_id AND o.active AND
            (o.user_id=%s OR o.user_id IN (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))))''',
        (case_id,user.role,user.id,user.id,user.id,user.id)).fetchone()


def event(conn,case_id,action,actor,note=None):
    conn.execute('INSERT INTO succession_events(case_id,action,actor_user_id,note) VALUES (%s,%s,%s,%s)',(case_id,action,actor,note))


@router.get('/properties/{ulpin}/owners')
def owners(ulpin: str,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        rows=conn.execute('''SELECT o.user_id AS registry_user_id,u.display_name,o.share_bps FROM ownerships o
            JOIN users u ON u.id=o.user_id WHERE o.parcel_id=%s AND o.active AND
            (%s='REGISTRAR' OR EXISTS(SELECT 1 FROM ownerships own WHERE own.parcel_id=o.parcel_id AND own.active
                AND (own.user_id=%s OR own.user_id IN (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s)))
            OR EXISTS(SELECT 1 FROM succession_cases c WHERE c.parcel_id=o.parcel_id AND
                (c.applicant_user_id=%s OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.heirs) h WHERE h->>'user_id'=%s))))
            ORDER BY o.user_id''',(ulpin,user.role,user.id,user.id,user.id,user.id)).fetchall()
    if not rows:
        raise HTTPException(404,'Active property ownership unavailable')
    return rows


@router.post('',status_code=201)
def submit(data: SuccessionClaim,response: Response,user=Depends(require_role('CITIZEN')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    if not repository.allow_attempt('succession:'+user.id,10):
        raise HTTPException(429,'Too many succession submissions; retry in 15 minutes')
    with repository.connect() as conn:
        lock_parcel(conn,data.parcel_id)
        ownership=snapshot(conn,data.parcel_id)
        deceased_share=next((share for owner,share in ownership if owner==str(data.deceased_user_id)),None)
        if not deceased_share or sum(h.share_bps for h in data.heirs)!=deceased_share:
            raise HTTPException(422,'Proposed heir shares must equal the deceased owner’s recorded share')
        heirs=[]
        for heir in data.heirs:
            account=conn.execute("SELECT a.user_id,a.username,u.display_name FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.username=%s AND a.role='CITIZEN' AND u.account_status='ACTIVE'",(heir.username.lower(),)).fetchone()
            if not account or str(account['user_id'])==str(data.deceased_user_id) or conn.execute('SELECT 1 FROM account_identity_links WHERE account_user_id=%s AND registry_user_id=%s',(account['user_id'] if account else None,data.deceased_user_id)).fetchone():
                raise HTTPException(422,'Every heir must be an active citizen account distinct from the deceased owner')
            heirs.append({'user_id':str(account['user_id']),'username':account['username'],'name':account['display_name'],'share_bps':heir.share_bps})
        if len({h['user_id'] for h in heirs})!=len(heirs):
            raise HTTPException(422,'An heir cannot be listed twice')
        represented={user.id}|{str(r['registry_user_id']) for r in conn.execute('SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s',(user.id,))}
        if str(data.deceased_user_id) in represented or not (any(h['user_id']==user.id for h in heirs) or any(o in represented and o!=str(data.deceased_user_id) for o,_ in ownership)):
            raise HTTPException(403,'Only a proposed heir or surviving co-owner can file this claim')
        if conn.execute("SELECT 1 FROM succession_cases WHERE parcel_id=%s AND deceased_user_id=%s AND status IN ('SUBMITTED','IN_REVIEW','EVIDENCE_VERIFIED')",(data.parcel_id,data.deceased_user_id)).fetchone():
            raise HTTPException(409,'An active succession claim already exists for this owner and parcel')
        row=conn.execute('''INSERT INTO succession_cases(parcel_id,applicant_user_id,deceased_user_id,heirs,death_certificate_reference,
            legal_heir_reference,document_hash,ownership_snapshot) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
            (data.parcel_id,user.id,data.deceased_user_id,Jsonb(heirs),data.death_certificate_reference,data.legal_heir_reference,data.document_hash.lower(),Jsonb(ownership))).fetchone()
        event(conn,row['id'],'SUBMITTED',user.id)
    return dict(row)|{'transfer_enabled':False,'message':'Claim recorded for evidence review. Ownership and blockchain records are unchanged.'}


@router.get('')
def list_cases(response: Response,limit: int=Query(50,ge=1,le=100),before: UUID|None=None,
               user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        return conn.execute('''SELECT c.* FROM succession_cases c WHERE
            (%s='REGISTRAR' OR c.applicant_user_id=%s OR EXISTS(SELECT 1 FROM jsonb_array_elements(c.heirs) h WHERE h->>'user_id'=%s)
             OR EXISTS(SELECT 1 FROM ownerships o WHERE o.parcel_id=c.parcel_id AND o.active AND (o.user_id=%s OR
                o.user_id IN (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))))
            AND (%s::uuid IS NULL OR (c.created_at,c.id)<(SELECT created_at,id FROM succession_cases WHERE id=%s))
            ORDER BY c.created_at DESC,c.id DESC LIMIT %s''',(user.role,user.id,user.id,user.id,user.id,before,before,limit)).fetchall()


@router.post('/{case_id}/assign')
def assign(case_id: UUID,response: Response,user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        case=conn.execute('SELECT parcel_id FROM succession_cases WHERE id=%s',(case_id,)).fetchone()
        if not case:
            raise HTTPException(404,'Succession claim unavailable')
        lock_parcel(conn,case['parcel_id'])
        case=conn.execute('SELECT * FROM succession_cases WHERE id=%s FOR UPDATE',(case_id,)).fetchone()
        reassigned=case['status'] in ('IN_REVIEW','EVIDENCE_VERIFIED') and not conn.execute("SELECT 1 FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=%s AND a.role='REGISTRAR' AND a.officer_verified_at IS NOT NULL AND u.account_status='ACTIVE'",(case['assigned_registrar_id'],)).fetchone()
        if (case['status']!='SUBMITTED' and not reassigned) or snapshot(conn,case['parcel_id'])!=case['ownership_snapshot']:
            raise HTTPException(409,'Claim is already assigned or property ownership changed')
        if user.id==str(case['applicant_user_id']) or any(h['user_id']==user.id for h in case['heirs']) or conn.execute('''SELECT 1 FROM ownerships o WHERE o.parcel_id=%s AND o.active AND (o.user_id=%s OR o.user_id IN
            (SELECT registry_user_id FROM account_identity_links WHERE account_user_id=%s))''',(case['parcel_id'],user.id,user.id)).fetchone():
            raise HTTPException(403,'An independent registrar must review this claim')
        if conn.execute("SELECT 1 FROM sale_chain_payloads c JOIN sale_requests s ON s.id=c.sale_id WHERE s.parcel_id=%s AND c.state IN ('PREPARED','SUBMITTED','REVIEW')",(case['parcel_id'],)).fetchone():
            raise HTTPException(409,'A prepared blockchain deal must be reconciled before opening succession review')
        status=case['status'] if reassigned else 'IN_REVIEW'
        conn.execute('UPDATE succession_cases SET status=%s,assigned_registrar_id=%s WHERE id=%s',(status,user.id,case_id))
        event(conn,case_id,'REASSIGNED' if reassigned else 'IN_REVIEW',user.id)
    return {'status':status,'transfer_enabled':False,'message':'New sale actions are held while evidence is reviewed.'}


@router.post('/{case_id}/review')
def review(case_id: UUID,data: CaseReview,response: Response,user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        case=conn.execute('SELECT parcel_id FROM succession_cases WHERE id=%s',(case_id,)).fetchone()
        if not case:
            raise HTTPException(404,'Succession claim unavailable')
        lock_parcel(conn,case['parcel_id'])
        case=conn.execute('SELECT * FROM succession_cases WHERE id=%s FOR UPDATE',(case_id,)).fetchone()
        if str(case['assigned_registrar_id'])!=user.id:
            raise HTTPException(403,'Assigned registrar required')
        if case['status'] not in ('IN_REVIEW','EVIDENCE_VERIFIED'):
            raise HTTPException(409,'Claim is no longer under review')
        if data.decision=='EVIDENCE_VERIFIED' and snapshot(conn,case['parcel_id'])!=case['ownership_snapshot']:
            raise HTTPException(409,'Property ownership changed; this claim cannot be endorsed')
        if data.decision=='EVIDENCE_VERIFIED':
            if case['status']=='EVIDENCE_VERIFIED':
                raise HTTPException(409,'Evidence was already reviewed')
            for heir in case['heirs']:
                if not conn.execute("SELECT 1 FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.user_id=%s AND a.role='CITIZEN' AND u.account_status='ACTIVE'",(heir['user_id'],)).fetchone():
                    raise HTTPException(409,'A proposed heir account is no longer eligible')
        conn.execute('UPDATE succession_cases SET status=%s,review_note=%s,reviewed_at=now() WHERE id=%s',
                     (data.decision,data.evidence_reference+' · '+data.note,case_id))
        event(conn,case_id,data.decision,user.id,data.evidence_reference+' · '+data.note)
    return {'status':data.decision,'transfer_enabled':False,'message':'Evidence review only. No ownership or blockchain transfer occurred.'}


@router.post('/{case_id}/withdraw')
def withdraw(case_id: UUID,response: Response,user=Depends(require_role('CITIZEN')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        case=conn.execute('SELECT * FROM succession_cases WHERE id=%s FOR UPDATE',(case_id,)).fetchone()
        if not case or str(case['applicant_user_id'])!=user.id:
            raise HTTPException(404,'Succession claim unavailable')
        if case['status']!='SUBMITTED':
            raise HTTPException(409,'Assigned claims require registrar review rather than withdrawal')
        conn.execute("UPDATE succession_cases SET status='WITHDRAWN' WHERE id=%s",(case_id,))
        event(conn,case_id,'WITHDRAWN',user.id)
    return {'status':'WITHDRAWN'}


@router.get('/{case_id}/events')
def events(case_id: UUID,response: Response,limit: int=Query(50,ge=1,le=100),before_id: int|None=Query(None,ge=1),
           user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        if not can_view(conn,case_id,user):
            raise HTTPException(404,'Succession claim unavailable')
        return conn.execute('''SELECT id,action,actor_user_id,note,created_at FROM succession_events WHERE case_id=%s
            AND (%s::bigint IS NULL OR id<%s) ORDER BY id DESC LIMIT %s''',(case_id,before_id,before_id,limit)).fetchall()


@router.get('/{case_id}')
def case_details(case_id: UUID,response: Response,user=Depends(current_user),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        case=can_view(conn,case_id,user)
        if not case:
            raise HTTPException(404,'Succession claim unavailable')
    return dict(case)|{'transfer_enabled':False}
