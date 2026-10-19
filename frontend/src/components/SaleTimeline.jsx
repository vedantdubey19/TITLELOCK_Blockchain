import { useState } from 'react';
import { saleApi, saleEventLabel } from '../services/saleService';

export function SaleTimeline({ saleId }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const load = async (older = false) => {
    setBusy(true); setError('');
    try {
      const before = older ? `?before_id=${events.at(-1).id}` : '';
      const rows = await saleApi(`/${saleId}/events${before}`);
      setEvents((previous) => older ? [...previous, ...rows] : rows);
      setMore(rows.length === 50);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2">
    <button disabled={busy} onClick={() => load()} className="underline">{events ? 'Refresh activity' : 'View activity'}</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {busy && <p role="status">Loading activity…</p>}
    {events?.length === 0 && <p>No activity recorded. Older deals may predate activity tracking.</p>}
    {events && <ol className="space-y-2 border-l pl-3">{events.map((event) => <li key={event.id}>
      <p className={event.action === 'TRANSFER_COMPLETED' ? 'text-green-700' : ['TRANSFER_FAILED', 'SALE_EXPIRED'].includes(event.action) ? 'text-red-700' : 'text-slate-700'}>
        <span aria-hidden="true">● </span>{saleEventLabel(event.action)}</p>
      {event.reason && <p className="text-red-700">Reason: {event.reason}</p>}
      <p className="text-xs text-slate-500">{event.actor_username || 'System'} · {new Date(event.created_at).toLocaleString()}</p>
    </li>)}</ol>}
    {more && <button disabled={busy} onClick={() => load(true)} className="underline">Load older activity</button>}
  </div>;
}
