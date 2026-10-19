import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

import { saleApi } from '../services/saleService';
import { SaleTimeline } from './SaleTimeline';

export function SaleRequestsPanel({ readOnly = false }) {
  const { currentUser } = useAuth();
  const registrar = currentUser?.role === 'REGISTRAR';
  const [filter, setFilter] = useState('ALL');
  const [sales, setSales] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState(null);
  const [proofs, setProofs] = useState({});
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ parcel_id: '', buyer_username: '', document_hash: '' });
  const reload = async () => { setSales(await saleApi()); setError(''); };
  useEffect(() => {
    let cancelled = false;
    saleApi().then((rows) => { if (!cancelled) setSales(rows); })
      .catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, []);
  const act = async (path, data, sale = null) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await saleApi(path, data);
      if (result.key) setIssued({ key: result.key, sale, expires: result.expires_at });
      else { setIssued(null); setProofs({}); setNotice(result.message || 'Sale request created'); }
      await reload();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const side = registrar ? 'registrar' : 'owner';
  return (
    <section className="space-y-4 p-5 bg-white rounded-2xl border border-slate-200 text-sm">
      <h2 className="text-lg font-bold">{readOnly ? 'Transfer tracking & activity' : 'Sale requests · two-key approval'}</h2>
      <p className="text-slate-600">A registrar starts the deal. Every owner and the assigned registrar approve with separate keys. Complete within 24 hours of the first owner key, or the property enters a seven-day sale cooldown.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {registrar && !readOnly && <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); act('', form); }}>
        {Object.keys(form).map((field) => <label key={field} className="text-xs capitalize">{field.replaceAll('_', ' ')}
          <input required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="block border rounded-lg p-2 text-slate-900" />
        </label>)}
        <button disabled={busy} className="p-2 rounded-lg bg-blue-600 text-white">Create sale request</button>
      </form>}
      {issued && <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
        <p className="font-bold">Your {side} key · shown once</p>
        <p>Request: {issued.sale}</p>
        <code className="block break-all select-all">{issued.key}</code>
        <p>{issued.expires ? `Deadline: ${new Date(issued.expires).toLocaleString()}` : 'The 24-hour window starts when an owner generates their key.'}</p>
        <p>Save it securely. It is lost when this page closes. Submit it below from your own account.</p>
        <button onClick={() => setIssued(null)} className="underline">Hide key</button>
      </div>}
      {!sales.length && <p>No sale requests for your account.</p>}
      {readOnly && <label className="block">Show history <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border rounded-lg p-2">
        <option value="ALL">All deals</option><option value="COMPLETED">Completed transfers</option>
        <option value="FAILED">Failed attempts</option><option value="EXPIRED">Expired deals</option><option value="PENDING">Pending deals</option>
      </select></label>}
      {sales.filter((sale) => filter === 'ALL' || (filter === 'FAILED' ? sale.last_failure_at : sale.status === filter)).map((sale) => {
        const canAct = !readOnly && sale.status === 'PENDING' && (registrar ? sale.registrar_username === currentUser.username : sale.is_owner);
        const generated = registrar ? sale.registrar_key_generated : sale.owner_key_generated;
        const approved = registrar ? sale.registrar_approved : sale.owner_approved;
        return <article key={sale.id} className="border rounded-xl p-4 space-y-2">
          <p className="font-semibold">{sale.parcel_id} <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${sale.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : sale.status === 'EXPIRED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}><span aria-hidden="true">●</span>{sale.status}</span></p>
          <p className="break-all text-xs">Request: {sale.id}</p>
          <p>Requested: {new Date(sale.created_at).toLocaleString()}</p>
          {sale.completed_at && <p className="text-green-700">● Transferred: {new Date(sale.completed_at).toLocaleString()}</p>}
          {sale.last_failure_at && <p className="text-red-700">● Last failed attempt: {new Date(sale.last_failure_at).toLocaleString()} · {sale.last_failure_reason}. View activity for every attempt.</p>}
          {sale.status === 'EXPIRED' && <p>Expired: {new Date(sale.expires_at).toLocaleString()}</p>}
          <p>Buyer: {sale.buyer_username} · Registrar: {sale.registrar_username}</p>
          <p>Owners approved: {sale.approved_owners}/{sale.required_owners} · Registrar: {sale.registrar_approved ? 'Approved' : 'Pending'}</p>
          {sale.expires_at && <p>Deadline: {new Date(sale.expires_at).toLocaleString()}</p>}
          {sale.status === 'EXPIRED' && sale.cooldown_until && <p>New deals blocked until: {new Date(sale.cooldown_until).toLocaleString()}</p>}
          <SaleTimeline saleId={sale.id} />
          {canAct && <div className="flex flex-wrap gap-2">
            {!generated && !approved && <button disabled={busy} onClick={() => act(`/${sale.id}/keys/${side}`, {}, sale.id)} className="border rounded-lg p-2">Generate my {side} key</button>}
            {generated && !approved && <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); act(`/${sale.id}/approve/${side}`, { key: proofs[sale.id] || '' }); }}>
              <input type="password" autoComplete="off" aria-label={`Your ${side} key for ${sale.parcel_id}`} required minLength={40} value={proofs[sale.id] || ''} onChange={(event) => setProofs({ ...proofs, [sale.id]: event.target.value })} className="border rounded-lg p-2" />
              <button disabled={busy} className="border rounded-lg p-2">Submit my key</button>
            </form>}
            {registrar && sale.registrar_approved && sale.approved_owners === sale.required_owners && <button disabled={busy} onClick={() => act(`/${sale.id}/complete`, {})} className="bg-blue-600 text-white rounded-lg p-2">Complete database transfer</button>}
          </div>}
        </article>;
      })}
      <button disabled={busy} onClick={() => { setBusy(true); reload().catch((failure) => setError(failure.message)).finally(() => setBusy(false)); }} className="underline">Refresh requests</button>
    </section>
  );
}
