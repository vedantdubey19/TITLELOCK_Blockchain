import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApiResource } from '../hooks/useApiResource';
import { saleEventLabel } from '../services/saleService';
import heroBannerImg from '../assets/hero_banner.jpg';

export function CitizenDashboardPage() {
  const { currentUser, parcels, propertiesLoading, propertiesError, refreshData } = useAuth();
  const sales = useApiResource('/api/sales');
  const notifications = useApiResource('/api/notifications');
  const pending = sales.data?.filter((sale) => sale.status === 'PENDING' && sale.is_owner && !sale.owner_approved).length;
  const refresh = () => { refreshData(); sales.refresh(); notifications.refresh(); };
  return <section className="space-y-5 text-slate-900">
    <div className="relative rounded-3xl overflow-hidden h-52 flex items-center">
      <img src={heroBannerImg} alt="Green landscape" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60" /><div className="relative text-white p-6"><h1 className="text-2xl font-bold">Welcome, {currentUser?.name}</h1><p>Your land records and transfer activity.</p></div>
    </div>
    <button onClick={refresh} className="underline">Refresh dashboard</button>
    <div className="grid sm:grid-cols-3 gap-4">
      <Link to="/citizen/properties" className="bg-white border rounded-xl p-4"><h2>Owned properties</h2><p className="text-2xl font-bold">{propertiesLoading ? '…' : propertiesError ? 'Unavailable' : parcels.length}</p></Link>
      <Link to="/citizen/tokens" className="bg-white border rounded-xl p-4"><h2>Owner approvals pending</h2><p className="text-2xl font-bold">{sales.loading ? '…' : sales.error ? 'Unavailable' : pending}</p></Link>
      <Link to="/citizen/transactions" className="bg-white border rounded-xl p-4"><h2>Completed deals involving you</h2><p className="text-2xl font-bold">{sales.loading ? '…' : sales.error ? 'Unavailable' : sales.data?.filter((sale) => sale.status === 'COMPLETED').length}</p></Link>
    </div>
    {propertiesError && <p role="alert" className="text-red-700">{propertiesError}</p>}
    {sales.error && <p role="alert" className="text-red-700">{sales.error}</p>}
    <article className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-bold">Your registered properties</h2>
      {propertiesLoading && <p role="status">Loading properties…</p>}
      {!propertiesLoading && !propertiesError && !parcels.length && <p>No properties are linked to this account.</p>}
      {parcels.slice(0,5).map((parcel) => <div key={parcel.id} className="border-b py-2"><p className="font-bold">{parcel.id}</p><p>Survey: {parcel.surveyNumber} · {parcel.areaSqm} m² · Registry status: {parcel.status}</p></div>)}
      <Link to="/citizen/properties" className="underline">View records, listing controls and live blockchain verification</Link>
    </article>
    <article className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-bold">Recent activity</h2>
      {notifications.loading && <p role="status">Loading activity…</p>}
      {notifications.error && <p role="alert" className="text-red-700">{notifications.error}</p>}
      {notifications.data?.length === 0 && <p>No sale notifications yet.</p>}
      {notifications.data?.slice(0,5).map((event) => <p key={event.event_id} className="border-b py-2"><span className={['TRANSFER_FAILED','SALE_EXPIRED'].includes(event.action) ? 'text-red-700' : event.action === 'TRANSFER_COMPLETED' ? 'text-green-700' : ''}>● {saleEventLabel(event.action)}</span> · {event.parcel_id}<br />{new Date(event.created_at).toLocaleString()} · {event.read_at ? 'Read' : 'Unread'}</p>)}
      <Link to="/citizen/notifications" className="underline">View all notifications</Link>
    </article>
    <nav className="flex gap-4 flex-wrap"><Link to="/citizen/map" className="underline">Property explorer</Link><Link to="/citizen/nominees" className="underline">Succession claims</Link><Link to="/citizen/profile" className="underline">Profile and wallet</Link></nav>
  </section>;
}
export default CitizenDashboardPage;
