import { Link } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource';

export function RegistrarDashboardPage() {
  const sales = useApiResource('/api/sales');
  const holds = useApiResource('/api/risk/holds');
  const succession = useApiResource('/api/succession');
  const refresh = () => { sales.refresh(); holds.refresh(); succession.refresh(); };
  const pending = sales.data?.filter((sale) => sale.status === 'PENDING');
  return <section className="space-y-5 text-slate-900">
    <h1 className="text-xl font-bold">Registrar dashboard</h1>
    <button onClick={refresh} className="underline">Refresh dashboard</button>
    <div className="grid sm:grid-cols-3 gap-4">
      {[['Pending sale requests',pending?.length,sales,'/registrar/petitions'],['Active risk holds (latest page)',holds.data?.length,holds,'/registrar/risk'],['Succession cases (latest page)',succession.data?.length,succession,'/registrar/succession']].map(([label,count,state,path]) => <Link key={path} to={path} className="bg-white border rounded-xl p-4"><h2>{label}</h2><p className="text-2xl font-bold">{state.loading ? '…' : state.error ? 'Unavailable' : count}</p></Link>)}
    </div>
    {[sales,holds,succession].map((state,index) => state.error && <p key={index} role="alert" className="text-red-700">{state.error}</p>)}
    <article className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-bold">Recent pending sale requests</h2>
      {sales.loading && <p role="status">Loading sale requests…</p>}
      {pending?.length === 0 && <p>No pending sale requests.</p>}
      {pending?.slice(0,5).map((sale) => <div key={sale.id} className="border-b py-2"><p className="font-bold">{sale.parcel_id} → {sale.buyer_name || sale.buyer_username}</p><p>{new Date(sale.created_at).toLocaleString()} · Owner approvals: {sale.approved_owners}/{sale.required_owners}</p><p className="text-xs break-all">Request: {sale.id}</p></div>)}
      <Link to="/registrar/petitions" className="underline">Review petitions and required transfer approvals</Link>
    </article>
    <nav className="flex gap-4 flex-wrap"><Link to="/registrar/risk" className="underline">Risk screening and holds</Link><Link to="/registrar/succession" className="underline">Succession evidence review</Link><Link to="/registrar/audit" className="underline">Transfer audit</Link><Link to="/registrar/credentials" className="underline">Profile and wallet</Link></nav>
    <p>Risk and succession cards show the latest 50 records. Use their registers to browse older records.</p>
  </section>;
}
export default RegistrarDashboardPage;
