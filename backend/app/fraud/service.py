"""Version-1 deterministic checks, not a probability that a title is genuine."""
import hashlib
import json

from fastapi import HTTPException
from psycopg.types.json import Jsonb


def lock_parcel(conn, parcel_id):
    conn.execute('INSERT INTO sale_parcel_state(parcel_id) VALUES (%s) ON CONFLICT DO NOTHING',(parcel_id,))
    conn.execute('SELECT parcel_id FROM sale_parcel_state WHERE parcel_id=%s FOR UPDATE',(parcel_id,))
    row=conn.execute('SELECT * FROM parcels WHERE ulpin=%s FOR UPDATE',(parcel_id,)).fetchone()
    if not row:
        raise HTTPException(404,'Property unavailable')
    return row


def restrictions(conn, parcel):
    parcel_id=parcel['ulpin']
    claims={table:conn.execute(f"SELECT id,status FROM {table} WHERE parcel_id=%s AND upper(COALESCE(status,'')) NOT IN ('CLEARED','CLOSED','RESOLVED','RELEASED','DISMISSED','REJECTED') ORDER BY id",(parcel_id,)).fetchall()
            for table in ('encumbrances','disputes')}
    holds=conn.execute('SELECT id FROM risk_review_holds WHERE parcel_id=%s AND resolved_at IS NULL ORDER BY id',(parcel_id,)).fetchall()
    succession=conn.execute("SELECT id FROM succession_cases WHERE parcel_id=%s AND status IN ('IN_REVIEW','EVIDENCE_VERIFIED') ORDER BY id",(parcel_id,)).fetchall()
    legal=bool(parcel['frozen'] or parcel['title_status'] not in ('VERIFIED','VERIFIED_WITH_ENCUMBRANCE') or str(parcel.get('risk_status') or '').upper() in ('HIGH','CRITICAL','REVIEW') or any(claims.values()))
    return claims,holds,succession,legal


def ensure_unrestricted(conn, parcel):
    claims,holds,succession,legal=restrictions(conn,parcel)
    if legal or holds or succession:
        raise HTTPException(409,'Unresolved legal claims, risk hold, or reviewed succession blocks this sale')


def evaluate(conn, settings, parcel, document_hash, sale_id=None):
    parcel_id=parcel['ulpin']
    owners=conn.execute('SELECT o.user_id,o.share_bps,u.account_status FROM ownerships o LEFT JOIN users u ON u.id=o.user_id WHERE o.parcel_id=%s AND o.active ORDER BY o.user_id',(parcel_id,)).fetchall()
    claims,holds,succession,legal=restrictions(conn,parcel)
    pending=conn.execute("SELECT id FROM sale_requests WHERE parcel_id=%s AND status='PENDING' AND (%s::uuid IS NULL OR id<>%s) ORDER BY id",(parcel_id,sale_id,sale_id)).fetchall()
    cooldown=conn.execute('SELECT cooldown_until FROM sale_parcel_state WHERE parcel_id=%s AND cooldown_until>clock_timestamp()',(parcel_id,)).fetchone()
    duplicates=conn.execute("SELECT id FROM sale_requests WHERE lower(btrim(document_hash))=lower(btrim(%s)) AND status IN ('PENDING','COMPLETED') AND (%s::uuid IS NULL OR id<>%s) ORDER BY id",(document_hash,sale_id,sale_id)).fetchall()
    invalid_ownership=not owners or sum(o['share_bps'] for o in owners)!=10000 or any(o['share_bps']<=0 or o['account_status']!='ACTIVE' for o in owners) or parcel['current_owner_user_id'] not in [o['user_id'] for o in owners]
    findings=[{'rule':'OWNERSHIP','blocked':invalid_ownership,'weight':100},
              {'rule':'LEGAL_RESTRICTIONS','blocked':legal,'weight':80},
              {'rule':'WORKFLOW_CONFLICT','blocked':bool(pending or cooldown or holds or succession),'weight':80},
              {'rule':'DOCUMENT_REUSE','blocked':bool(duplicates),'weight':60}]
    chain_status='NOT_CHECKED_MOCK_MODE'
    if settings.chain_mode=='live':
        from ..chain.service import Registry
        try:
            Registry(settings).check(conn,parcel_id)
            chain_status='MATCH'
        except HTTPException as failure:
            if failure.status_code!=409:
                raise
            chain_status='BLOCKED: '+str(failure.detail)
    findings.append({'rule':'BLOCKCHAIN_INTEGRITY','blocked':chain_status.startswith('BLOCKED'),'weight':100,'status':chain_status})
    snapshot={'parcel':[parcel_id,parcel['frozen'],parcel['title_status'],str(parcel['current_owner_user_id'])],
              'record':[parcel.get('survey_number'),parcel.get('area_sqm'),parcel.get('transfer_history')],
              'owners':owners,'claims':claims,'holds':holds,'succession':succession,'pending':pending,
              'cooldown':cooldown,'duplicates':duplicates,'chain_status':chain_status}
    digest=hashlib.sha256(json.dumps(snapshot,sort_keys=True,default=str,separators=(',',':')).encode()).hexdigest()
    return {'snapshot_hash':digest,'findings':findings,'score':min(100,sum(f['weight'] for f in findings if f['blocked'])),
            'decision':'BLOCK' if any(f['blocked'] for f in findings) else 'CLEAR'}


def save_assessment(conn, parcel_id, registrar_id, buyer_id, document_hash, result):
    return conn.execute('''INSERT INTO risk_assessments(parcel_id,registrar_user_id,buyer_user_id,document_hash,snapshot_hash,findings,score,decision)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id,expires_at''',
        (parcel_id,registrar_id,buyer_id,document_hash,result['snapshot_hash'],Jsonb(result['findings']),result['score'],result['decision'])).fetchone()


def approve_assessment(conn, settings, parcel, registrar_id, buyer_id, document_hash, assessment_id=None):
    result=evaluate(conn,settings,parcel,document_hash)
    if result['decision']!='CLEAR':
        raise HTTPException(409,'Risk checks blocked this sale: '+', '.join(f['rule'] for f in result['findings'] if f['blocked']))
    if assessment_id:
        assessment=conn.execute('SELECT *,expires_at>clock_timestamp() AS valid FROM risk_assessments WHERE id=%s FOR UPDATE',(assessment_id,)).fetchone()
        if not assessment or not assessment['valid'] or assessment['consumed_by'] or assessment['decision']!='CLEAR' or \
            (assessment['parcel_id'],str(assessment['registrar_user_id']),str(assessment['buyer_user_id']),assessment['document_hash'],assessment['snapshot_hash']) != \
            (parcel['ulpin'],str(registrar_id),str(buyer_id),document_hash,result['snapshot_hash']):
            raise HTTPException(409,'Risk assessment is expired, consumed, changed, or belongs to another deal')
        return assessment_id
    return save_assessment(conn,parcel['ulpin'],registrar_id,buyer_id,document_hash,result)['id']
