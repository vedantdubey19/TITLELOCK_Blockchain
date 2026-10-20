import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { activityApi, saleEventLabel } from '../services/saleService';

export function CitizenNotificationsPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    activityApi('/api/notifications').then((rows) => {
      if (!cancelled) { setItems(rows); setMore(rows.length === 50); }
    }).catch((failure) => { if (!cancelled) setError(failure.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, []);
  const refresh = async (older = false) => {
    setBusy(true); setError('');
    try {
      const suffix = older ? `?before_id=${items.at(-1).event_id}` : '';
      const rows = await activityApi(`/api/notifications${suffix}`);
      setItems((previous) => older ? [...previous, ...rows] : rows);
      setMore(rows.length === 50);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const markRead = async (id) => {
    setBusy(true); setError('');
    try {
      const row = await activityApi(`/api/notifications/${id}/read`, {});
      setItems((previous) => previous.map((item) => item.event_id === id ? { ...item, read_at: row.read_at } : item));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 text-slate-900">
    <h1 className="text-xl font-bold">Sale notifications</h1>
    <p>Activity for your sale requests. Older deals may predate notification tracking.</p>
    <button disabled={busy} onClick={() => refresh()} className="underline">Refresh notifications</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {busy && <p role="status">Loading…</p>}
    {!items.length && !error && <p>No sale notifications yet.</p>}
    {items.map((item) => <article key={item.event_id} className="bg-white p-4 border rounded-xl space-y-2">
      <p className="font-semibold">{saleEventLabel(item.action)} · {item.parcel_id}</p>
      <p>{item.reason}</p>
      {item.buyer_name && <p>Buyer: {item.buyer_name} · Phone: {item.buyer_phone || "Not recorded"}</p>}
      <p className="text-xs">{new Date(item.created_at).toLocaleString()} · {item.read_at ? 'Read' : 'Unread'}</p>
      <p className="text-xs break-all">Request: {item.sale_id}</p>
      {!item.read_at && <button disabled={busy} onClick={() => markRead(item.event_id)} className="underline mr-4">Mark as read</button>}
      <Link className="underline" to={currentUser?.role === 'REGISTRAR' ? '/registrar/audit' : '/citizen/transactions'}>View transfer tracking</Link>
    </article>)}
    {more && <button disabled={busy} onClick={() => refresh(true)} className="underline">Load older notifications</button>}
  </section>;
}
export default CitizenNotificationsPage;
