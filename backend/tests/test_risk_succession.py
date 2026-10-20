from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.test_auth_postgres import postgres_auth
from tests.test_sales import sales, exchange_approvals


def api_for(repo,accounts):
    client=TestClient(create_app(Settings(_env_file=None,app_env='testing',database_url=repo.database_url)))
    return lambda name,method,path,data=None: client.request(method,path,json=data,
        headers={'Authorization':'Bearer '+accounts[name]['access_token']})


def assessment_data(parcel='LAND-1',document='unique-risk-document'):
    return dict(parcel_id=parcel,buyer_username='buyer',document_hash=document)


def test_assessments_are_bound_single_use_and_expire(sales):
    repo,accounts,call,_=sales;api=api_for(repo,accounts)
    data=assessment_data()
    assert api('buyer','POST','/api/risk/assessments',data).status_code==403
    result=api('registrar','POST','/api/risk/assessments',data)
    assert result.status_code==201,result.text
    assert result.headers['cache-control']=='no-store'
    body=result.json();assert body['decision']=='CLEAR' and len(body['findings'])==5
    assert body['findings'][-1]['status']=='NOT_CHECKED_MOCK_MODE'
    ident=body['id']
    with repo.connect() as c:
        row=c.execute('SELECT expires_at-created_at AS duration FROM risk_assessments WHERE id=%s',(ident,)).fetchone()
        assert row['duration']==timedelta(minutes=30)
    assert call('otherregistrar','POST',data=data | {'assessment_id':ident}).status_code==409
    result=call('registrar','POST',data=data | {'assessment_id':ident})
    assert result.status_code==201,result.text
    with repo.connect() as c:
        assert str(c.execute('SELECT consumed_by FROM risk_assessments WHERE id=%s',(ident,)).fetchone()['consumed_by'])==result.json()['id']
    second=assessment_data('LAND-2','different-document')
    ident=api('registrar','POST','/api/risk/assessments',second).json()['id']
    with repo.connect() as c:
        c.execute("UPDATE risk_assessments SET expires_at=now()-interval '1 second' WHERE id=%s",(ident,))
    assert call('registrar','POST',data=second | {'assessment_id':ident}).status_code==409


def test_changed_snapshot_and_legal_claims_block_sales(sales):
    repo,accounts,call,create=sales;api=api_for(repo,accounts)
    data=assessment_data();ident=api('registrar','POST','/api/risk/assessments',data).json()['id']
    with repo.connect() as c:
        c.execute("UPDATE parcels SET transfer_history='[{\"changed\":true}]' WHERE ulpin='LAND-1'")
    assert call('registrar','POST',data=data | {'assessment_id':ident}).status_code==409
    with repo.connect() as c:
        c.execute("INSERT INTO encumbrances(parcel_id,status) VALUES ('LAND-1','ACTIVE')")
    assessment=api('registrar','POST','/api/risk/assessments',data).json()
    assert assessment['decision']=='BLOCK'
    assert next(f for f in assessment['findings'] if f['rule']=='LEGAL_RESTRICTIONS')['blocked'] is True
    assert create().status_code==409
    with repo.connect() as c:
        c.execute("UPDATE encumbrances SET status='RELEASED'")
        c.execute("UPDATE parcels SET transfer_history='[]' WHERE ulpin='LAND-1'")
    sale=create(legacy=False).json()['id'];exchange_approvals(call,sale)
    with repo.connect() as c:
        c.execute("INSERT INTO disputes(parcel_id,status) VALUES ('LAND-1','ACTIVE')")
    assert call('registrar','POST',f'/{sale}/complete',{}).status_code==409
    with repo.connect() as c:
        assert c.execute("SELECT count(*) AS n FROM ownerships WHERE parcel_id='LAND-1' AND active").fetchone()['n']==2


def test_manual_hold_is_audited_and_never_clears_court_freeze(sales):
    repo,accounts,call,create=sales;api=api_for(repo,accounts)
    ident=api('registrar','POST','/api/risk/assessments',assessment_data()).json()['id']
    evidence=dict(reason='Original documents need investigation',evidence_reference='office-review-001')
    row=api('registrar','POST',f'/api/risk/assessments/{ident}/hold',evidence)
    assert row.status_code==201,row.text
    hold=row.json()['id']
    assert create().status_code==409
    assert api('buyer','POST',f'/api/risk/holds/{hold}/resolve',evidence).status_code==403
    with repo.connect() as c:
        c.execute("UPDATE parcels SET frozen=true WHERE ulpin='LAND-1'")
    assert api('otherregistrar','POST',f'/api/risk/holds/{hold}/resolve',evidence).status_code==200
    assert create().status_code==409
    assert api('registrar','GET','/api/risk/holds').json()==[]
    with repo.connect() as c:
        row=c.execute('SELECT * FROM risk_review_holds WHERE id=%s',(hold,)).fetchone()
        assert row['resolved_by'] and row['resolved_at'] and row['evidence_reference']=='office-review-001'


def test_duplicate_document_is_serialized_across_parcels(sales):
    _,_,call,_=sales
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda parcel:call('registrar','POST',data=assessment_data(parcel,'same-document-for-two-parcels')).status_code,('LAND-1','LAND-2')))
    assert sorted(results)==[201,409]


def claim(accounts):
    return dict(parcel_id='LAND-1',deceased_user_id=accounts['owner']['user']['id'],
        heirs=[{'username':'buyer','share_bps':6000}],death_certificate_reference='death-record-reference',
        legal_heir_reference='court-record-reference',document_hash='a'*64)


def test_succession_is_review_only_private_and_requires_assigned_registrar(sales,postgres_auth):
    repo,accounts,call,create=sales;api=api_for(repo,accounts);data=claim(accounts)
    assert api('owner','POST','/api/succession',data).status_code==403
    result=api('buyer','POST','/api/succession',data)
    assert result.status_code==201,result.text
    case=result.json()['id'];assert result.json()['transfer_enabled'] is False
    client,_=postgres_auth
    outsider=client.post('/api/auth/signup',json=dict(name='Outsider',username='outsider',email='outsider@example.com',password='Password 123!',aadhaar='234567890123')).json()
    accounts['outsider']=outsider
    assert api('outsider','GET','/api/succession').json()==[]
    assert api('outsider','GET',f'/api/succession/{case}').status_code==404
    assert api('outsider','GET',f'/api/succession/{case}/events').status_code==404
    assert api('buyer','POST','/api/succession',data).status_code==409
    assert create().status_code==201  # An unreviewed citizen claim cannot freeze a property.
    assert api('registrar','POST',f'/api/succession/{case}/assign',{}).status_code==200
    sale=call('registrar','GET').json()[0]['id']
    assert call('owner','POST',f'/{sale}/keys/owner',{}).status_code==409
    decision=dict(decision='EVIDENCE_VERIFIED',evidence_reference='checked-original-documents',note='Evidence reviewed; transfer authority undecided')
    assert api('otherregistrar','POST',f'/api/succession/{case}/review',decision).status_code==403
    result=api('registrar','POST',f'/api/succession/{case}/review',decision)
    assert result.status_code==200 and result.json()['transfer_enabled'] is False
    assert api('buyer','POST',f'/api/succession/{case}/complete',{}).status_code==404
    with repo.connect() as c:
        assert c.execute("SELECT count(*) AS n FROM ownerships WHERE parcel_id='LAND-1' AND active").fetchone()['n']==2
        assert c.execute('SELECT count(*) AS n FROM sale_chain_payloads').fetchone()['n']==0
    actions=[e['action'] for e in api('buyer','GET',f'/api/succession/{case}/events').json()]
    assert actions==['EVIDENCE_VERIFIED','IN_REVIEW','SUBMITTED']
    assert api('registrar','POST',f'/api/succession/{case}/review',decision | {'decision':'REJECTED','note':'Claim withdrawn after evidence clarification'}).status_code==200
    assert call('owner','POST',f'/{sale}/keys/owner',{}).status_code==200


def test_succession_shares_withdrawal_and_stale_ownership(sales):
    repo,accounts,_,_=sales;api=api_for(repo,accounts);data=claim(accounts)
    assert api('buyer','POST','/api/succession',data | {'heirs':[{'username':'buyer','share_bps':10000}]}).status_code==422
    assert api('buyer','POST','/api/succession',data | {'heirs':[{'username':'buyer','share_bps':3000}]*2}).status_code==422
    result=api('buyer','POST','/api/succession',data);case=result.json()['id']
    assert api('coowner','POST',f'/api/succession/{case}/withdraw',{}).status_code==404
    assert api('buyer','POST',f'/api/succession/{case}/withdraw',{}).status_code==200
    case=api('buyer','POST','/api/succession',data).json()['id']
    with repo.connect() as c:
        c.execute("UPDATE ownerships SET share_bps=5000 WHERE parcel_id='LAND-1'")
    assert api('registrar','POST',f'/api/succession/{case}/assign',{}).status_code==409


def test_prepared_chain_deal_cannot_be_overridden_by_review_hold(sales):
    from psycopg.types.json import Jsonb
    repo,accounts,call,create=sales;api=api_for(repo,accounts)
    assessment=api('registrar','POST','/api/risk/assessments',assessment_data()).json()['id']
    case=api('buyer','POST','/api/succession',claim(accounts)).json()['id']
    sale=create(legacy=False).json()['id']
    with repo.connect() as c:
        c.execute("INSERT INTO sale_chain_payloads(sale_id,typed_data,old_state,new_state,state) VALUES (%s,%s,%s,%s,'PREPARED')",(sale,Jsonb({}),Jsonb({}),Jsonb({})))
    evidence=dict(reason='Review submitted after preparation',evidence_reference='review-timing-reference')
    assert api('registrar','POST',f'/api/risk/assessments/{assessment}/hold',evidence).status_code==409
    assert api('registrar','POST',f'/api/succession/{case}/assign',{}).status_code==409
    with repo.connect() as c:
        assert c.execute('SELECT status FROM succession_cases WHERE id=%s',(case,)).fetchone()['status']=='SUBMITTED'
        assert c.execute('SELECT count(*) AS n FROM risk_review_holds').fetchone()['n']==0


def test_only_inactive_registrar_assignments_can_be_taken_over(sales):
    from app.cli.review_officer import review
    repo,accounts,_,_=sales;api=api_for(repo,accounts)
    case=api('buyer','POST','/api/succession',claim(accounts)).json()['id']
    assert api('registrar','POST',f'/api/succession/{case}/assign',{}).status_code==200
    assert api('otherregistrar','POST',f'/api/succession/{case}/assign',{}).status_code==409
    review(repo,'registrar','REVOKED','synthetic-officer-revocation','test-secret-key')
    assert api('otherregistrar','POST',f'/api/succession/{case}/assign',{}).status_code==200
    decision=dict(decision='REJECTED',evidence_reference='reviewed-by-new-officer',note='Insufficient evidence for this claim')
    assert api('otherregistrar','POST',f'/api/succession/{case}/review',decision).status_code==200
    actions=[e['action'] for e in api('buyer','GET',f'/api/succession/{case}/events').json()]
    assert actions==['REJECTED','REASSIGNED','IN_REVIEW','SUBMITTED']
