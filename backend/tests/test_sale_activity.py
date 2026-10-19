import pytest

from tests.test_sales import sales
from tests.test_auth_postgres import postgres_auth


def timeline(repo, sale_id):
    with repo.connect() as conn:
        return conn.execute('SELECT * FROM sale_events WHERE sale_id=%s ORDER BY id', (sale_id,)).fetchall()


def test_private_timeline_and_notifications(sales):
    repo, accounts, call, create = sales
    sale = create().json()['id']
    assert [event['action'] for event in timeline(repo, sale)] == ['SALE_REQUESTED']
    assert call('otherregistrar', 'GET', f'/{sale}/events').status_code == 404
    from fastapi.testclient import TestClient
    from app.main import create_app
    from app.config import Settings
    client = TestClient(create_app(Settings(_env_file=None, database_url=repo.database_url)))

    def inbox(name, method='GET', suffix='', body=None):
        return client.request(method, '/api/notifications'+suffix,
                              headers={'Authorization': 'Bearer '+accounts[name]['access_token']}, json=body)

    assert client.get('/api/notifications').status_code == 401
    for name in ('owner', 'coowner', 'buyer', 'registrar'):
        rows = inbox(name).json()
        assert len(rows) == 1 and rows[0]['read_at'] is None
        assert rows[0]['sale_id'] == sale
    assert inbox('otherregistrar').json() == []
    event_id = inbox('owner').json()[0]['event_id']
    assert inbox('otherregistrar', 'POST', f'/{event_id}/read', {}).status_code == 404
    read = inbox('owner', 'POST', f'/{event_id}/read', {})
    assert read.status_code == 200
    assert inbox('owner', 'POST', f'/{event_id}/read', {}).json()['read_at'] == read.json()['read_at']
    assert inbox('owner', suffix='?unread_only=true').json() == []
    assert inbox('coowner', suffix='?unread_only=true').json()[0]['read_at'] is None
    key = call('owner', 'POST', f'/{sale}/keys/owner', {}).json()['key']
    assert call('owner', 'POST', f'/{sale}/approve/owner', {'key': key}).status_code == 200
    count = len(timeline(repo, sale))
    assert call('owner', 'POST', f'/{sale}/approve/owner', {'key': key}).status_code == 401
    assert len(timeline(repo, sale)) == count
    response = call('buyer', 'GET', f'/{sale}/events?limit=2')
    assert response.headers['cache-control'] == 'no-store'
    rows = response.json()
    assert [r['action'] for r in rows] == ['OWNER_APPROVED', 'OWNER_KEY_ISSUED']
    assert len(call('buyer', 'GET', f'/{sale}/events?before_id={rows[-1]["id"]}').json()) == 1
    assert key not in response.text and 'key_hash' not in response.text
    assert len(inbox('owner').json()) == 3
    assert inbox('owner', suffix=f'?before_id={event_id}').json() == []


def test_audit_failure_rolls_back_action(sales, monkeypatch):
    repo, _, call, create = sales
    sale = create().json()['id']
    key = call('owner', 'POST', f'/{sale}/keys/owner', {}).json()['key']

    def fail(*args, **kwargs):
        raise RuntimeError('Simulated event write failure')

    with monkeypatch.context() as scoped:
        scoped.setattr('app.transfers.sales.record_event', fail)
        with pytest.raises(RuntimeError):
            call('owner', 'POST', f'/{sale}/approve/owner', {'key': key})
    with repo.connect() as conn:
        assert not conn.execute('SELECT approved FROM sale_owner_approvals WHERE request_id=%s AND approved_by IS NOT NULL', (sale,)).fetchone()['approved']
    assert [e['action'] for e in timeline(repo, sale)] == ['SALE_REQUESTED', 'OWNER_KEY_ISSUED']
    assert call('owner', 'POST', f'/{sale}/approve/owner', {'key': key}).status_code == 200


def test_expiry_event_is_recorded_once(sales):
    repo, _, call, create = sales
    sale = create().json()['id']
    call('owner', 'POST', f'/{sale}/keys/owner', {})
    with repo.connect() as conn:
        conn.execute("UPDATE sale_requests SET expires_at=now()-interval '1 second' WHERE id=%s", (sale,))
    call('owner', 'GET')
    call('registrar', 'GET')
    rows = timeline(repo, sale)
    assert [r['action'] for r in rows].count('SALE_EXPIRED') == 1
    assert rows[-1]['actor_user_id'] is None


def test_failed_transfer_has_date_reason_and_survives_success(sales):
    repo, _, call, create = sales
    sale = create().json()['id']
    assert call('registrar', 'POST', f'/{sale}/complete', {}).status_code == 409
    events = timeline(repo, sale)
    assert events[-1]['action'] == 'TRANSFER_FAILED'
    assert events[-1]['created_at'] is not None
    assert 'approve' in events[-1]['reason']
    assert call('otherregistrar', 'POST', f'/{sale}/complete', {}).status_code == 403
    assert len(timeline(repo, sale)) == len(events)
    for name, side in [('owner','owner'),('coowner','owner'),('registrar','registrar')]:
        key = call(name,'POST',f'/{sale}/keys/{side}',{}).json()['key']
        assert call(name,'POST',f'/{sale}/approve/{side}',{'key':key}).status_code == 200
    assert call('registrar','POST',f'/{sale}/complete',{}).status_code == 200
    result = call('buyer','GET').json()[0]
    assert result['completed_at'] is not None
    assert result['last_failure_at'] is not None
    assert result['last_failure_reason'] == events[-1]['reason']
    actions = [e['action'] for e in timeline(repo, sale)]
    assert actions.count('TRANSFER_FAILED') == actions.count('TRANSFER_COMPLETED') == 1
