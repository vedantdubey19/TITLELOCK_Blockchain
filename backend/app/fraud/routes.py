from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field

from ..auth.routes import check_origin, get_repository, require_role
from ..transfers.sales import expire_sales
from .service import lock_parcel, evaluate, save_assessment

router=APIRouter(prefix='/api/risk',tags=['risk review'],dependencies=[Depends(check_origin)])


class AssessmentRequest(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    parcel_id: str=Field(min_length=1,max_length=150)
    buyer_username: str=Field(min_length=3,max_length=64)
    document_hash: str=Field(min_length=8,max_length=200)


class ReviewEvidence(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    reason: str=Field(min_length=5,max_length=500)
    evidence_reference: str=Field(min_length=5,max_length=500)


@router.post('/assessments',status_code=201)
def assess(data: AssessmentRequest,request: Request,response: Response,user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    expire_sales(repository)
    with repository.connect() as conn:
        parcel=lock_parcel(conn,data.parcel_id)
        buyer=conn.execute("SELECT a.user_id FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.username=%s AND a.role='CITIZEN' AND u.account_status='ACTIVE'",(data.buyer_username.lower(),)).fetchone()
        if not buyer:
            raise HTTPException(404,'Active citizen buyer unavailable')
        result=evaluate(conn,request.app.state.settings,parcel,data.document_hash)
        row=save_assessment(conn,data.parcel_id,user.id,buyer['user_id'],data.document_hash,result)
    return dict(row)|result|{'rules_version':1,'message':'Rule-based screening, not proof of legal title or document authenticity.'}


@router.get('/assessments')
def assessments(response: Response,parcel_id: str=Query('',max_length=150),limit: int=Query(50,ge=1,le=100),
                before: UUID|None=None,user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        return conn.execute('''SELECT * FROM risk_assessments WHERE (%s='' OR parcel_id=%s)
            AND (%s::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM risk_assessments WHERE id=%s))
            ORDER BY created_at DESC,id DESC LIMIT %s''',(parcel_id,parcel_id,before,before,limit)).fetchall()


@router.post('/assessments/{assessment_id}/hold',status_code=201)
def flag(assessment_id: UUID,data: ReviewEvidence,response: Response,user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        assessment=conn.execute('SELECT parcel_id FROM risk_assessments WHERE id=%s',(assessment_id,)).fetchone()
        if not assessment:
            raise HTTPException(404,'Assessment unavailable')
        lock_parcel(conn,assessment['parcel_id'])
        if conn.execute("SELECT 1 FROM sale_chain_payloads c JOIN sale_requests s ON s.id=c.sale_id WHERE s.parcel_id=%s AND c.state IN ('PREPARED','SUBMITTED','REVIEW')",(assessment['parcel_id'],)).fetchone():
            raise HTTPException(409,'A prepared blockchain deal must be reconciled before opening a hold')
        if conn.execute('SELECT 1 FROM risk_review_holds WHERE parcel_id=%s AND resolved_at IS NULL',(assessment['parcel_id'],)).fetchone():
            raise HTTPException(409,'An unresolved risk hold already exists')
        return conn.execute('''INSERT INTO risk_review_holds(assessment_id,parcel_id,opened_by,reason,evidence_reference)
            VALUES (%s,%s,%s,%s,%s) RETURNING *''',(assessment_id,assessment['parcel_id'],user.id,data.reason,data.evidence_reference)).fetchone()


@router.get('/holds')
def holds(response: Response,include_resolved: bool=False,limit: int=Query(50,ge=1,le=100),before: UUID|None=None,
          user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        return conn.execute('''SELECT * FROM risk_review_holds WHERE (%s OR resolved_at IS NULL)
            AND (%s::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM risk_review_holds WHERE id=%s))
            ORDER BY created_at DESC,id DESC LIMIT %s''',(include_resolved,before,before,limit)).fetchall()


@router.post('/holds/{hold_id}/resolve')
def resolve(hold_id: UUID,data: ReviewEvidence,response: Response,user=Depends(require_role('REGISTRAR')),repository=Depends(get_repository)):
    response.headers['Cache-Control']='no-store'
    with repository.connect() as conn:
        row=conn.execute('SELECT parcel_id FROM risk_review_holds WHERE id=%s',(hold_id,)).fetchone()
        if not row:
            raise HTTPException(404,'Risk hold unavailable')
        lock_parcel(conn,row['parcel_id'])
        row=conn.execute('''UPDATE risk_review_holds SET resolved_by=%s,resolution_reference=%s,resolved_at=now()
            WHERE id=%s AND resolved_at IS NULL RETURNING *''',(user.id,data.reason+' · '+data.evidence_reference,hold_id)).fetchone()
        if not row:
            raise HTTPException(409,'Risk hold already resolved')
    return row
