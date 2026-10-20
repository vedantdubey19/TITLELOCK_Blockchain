from types import SimpleNamespace

from psycopg.types.json import Jsonb

from app.chain.settlement import reconcile_one
from tests.test_auth_postgres import postgres_auth
from tests.test_sales import sales


def test_mining_during_execution_lookup_cannot_expire_deal(sales, postgres_auth, monkeypatch):
    repo, _, _, create = sales
    client, _ = postgres_auth
    sale_id = create(legacy=False).json()['id']
    with repo.connect() as conn:
        conn.execute('''INSERT INTO sale_chain_payloads(sale_id,typed_data,old_state,new_state,state)
            VALUES (%s,%s,%s,%s,'PREPARED')''', (sale_id,
            Jsonb({'message': {'dealId': '0x'+'11'*32, 'deadline': 1000}}), Jsonb({}), Jsonb({})))
    head = {'number': 10, 'timestamp': 999}
    reads = []

    def get_block(tag):
        reads.append('block')
        return head.copy()

    def execution(block_identifier=None):
        reads.append(('execution', block_identifier))
        # A transfer is mined at the deadline and another block follows during RPC.
        # An unpinned zero result followed by reading the newer head falsely expires it.
        head.update(number=12, timestamp=1001)
        return bytes(32)

    chain = SimpleNamespace(w3=SimpleNamespace(eth=SimpleNamespace(get_block=get_block)),
        contract=SimpleNamespace(functions=SimpleNamespace(
            executedDeals=lambda deal: SimpleNamespace(call=execution))))
    monkeypatch.setattr('app.chain.settlement.Registry', lambda settings: chain)
    reconcile_one(repo, client.app.state.settings, sale_id)
    assert reads == ['block', ('execution', 10)]
    with repo.connect() as conn:
        assert conn.execute('SELECT state FROM sale_chain_payloads WHERE sale_id=%s',(sale_id,)).fetchone()['state']=='PREPARED'
        assert conn.execute('SELECT status FROM sale_requests WHERE id=%s',(sale_id,)).fetchone()['status']=='PENDING'
        assert conn.execute('SELECT cooldown_until FROM sale_parcel_state WHERE parcel_id=%s',('LAND-1',)).fetchone()['cooldown_until'] is None
