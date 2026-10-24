import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

import { saleApi } from '../services/saleService';
import { ChainVerification } from './ChainVerification';
import { activityApi } from '../services/saleService';
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
  const [lookup, setLookup] = useState(null);
  const [form, setForm] = useState({ parcel_id: '', buyer_username: '', document_hash: '', buyer_name: '', buyer_phone: '' });
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
      if (result.key) setIssued({ key: result.key, sale, expires: result.expires_at, exchange: sales.find((row) => row.id === sale)?.key_exchange_version === 2 });
      else { setIssued(null); setProofs({}); setNotice(result.message || 'Sale request created'); }
      await reload();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const side = registrar ? 'registrar' : 'owner';
  return (
    <section className="space-y-4 p-5 bg-white rounded-2xl border border-slate-200 text-sm">
      <h2 className="text-lg font-bold">{readOnly ? 'Transfer tracking & activity' : 'Sale requests · two-key approval'}</h2>
      <p className="text-slate-600">A registrar starts the deal. Each owner enters the registrar’s key; the registrar enters each owner’s key. After both approvals, TitleLock records a hash-only receipt on the blockchain. Complete within 24 hours of the first owner key, or the property enters a seven-day sale cooldown.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {registrar && !readOnly && <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); act('', form); }}>
        {Object.keys(form).map((field) => <label key={field} className="text-xs capitalize">{field.replaceAll('_', ' ')}
          <input required={!['buyer_name', 'buyer_phone'].includes(field)} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="block border rounded-lg p-2 text-slate-900" />
        </label>)}
        <button type="button" disabled={busy || !form.parcel_id} className="underline" onClick={async () => {
          setBusy(true); setError(''); setLookup(null);
          try {
            const rows = await activityApi(`/api/properties/discover?search=${encodeURIComponent(form.parcel_id)}`);
            const found = rows.find((row) => row.ulpin === form.parcel_id);
            if (!found) throw new Error('ULPIN not found');
            setLookup(found);
          } catch (failure) { setError(failure.message); } finally { setBusy(false); }
        }}>Look up ULPIN and owner</button>
        <button disabled={busy} className="p-2 rounded-lg bg-blue-600 text-white">Create sale request</button>
      </form>}
      {lookup && <div className="border rounded-xl p-3 space-y-2">
        <p>{lookup.ulpin} · Owner: {lookup.current_owner || 'Not recorded'} · {lookup.title_status}</p>
        <p>{lookup.for_sale ? 'All owners agreed to list for sale' : 'Not advertised for sale'} · Frozen: {lookup.frozen ? 'Yes' : 'No'}</p>
        <ChainVerification key={lookup.ulpin} ulpin={lookup.ulpin} />
      </div>}
      {issued && <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
        <p className="font-bold">Your {side} key · shown once</p>
        <p>Request: {issued.sale}</p>
        <code className="block break-all select-all">{issued.key}</code>
        <p>{issued.expires ? `Deadline: ${new Date(issued.expires).toLocaleString()}` : 'The 24-hour window starts when an owner generates their key.'}</p>
        <p>Save it securely. It is lost when this page closes. {issued.exchange ? 'Give it securely to the other party for this deal. Never enter your own key.' : 'Legacy request: submit this key from your own account.'}</p>
        <button onClick={() => setIssued(null)} className="underline">Hide key</button>
      </div>}
      {!sales.length && <p>No sale requests for your account.</p>}
      {readOnly && <label className="block">Show history <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border rounded-lg p-2">
        <option value="ALL">All deals</option><option value="COMPLETED">Completed transfers</option>
        <option value="FAILED">Failed attempts</option><option value="EXPIRED">Expired deals</option><option value="PENDING">Pending deals</option>
      </select></label>}
      {sales.filter((sale) => filter === 'ALL' || (filter === 'FAILED' ? sale.last_failure_at : sale.status === filter)).map((sale) => {
        const canAct = !readOnly && sale.status === 'PENDING' && !['PREPARED', 'SUBMITTED', 'REVIEW'].includes(sale.chain_state) && (registrar ? sale.registrar_username === currentUser.username : sale.is_owner);
        const generated = registrar ? sale.registrar_key_generated : sale.owner_key_generated;
        const approved = registrar ? sale.registrar_approved : sale.owner_approved;
        const exchange = sale.key_exchange_version === 2;
        const receivedKeyLabel = exchange ? (registrar ? 'Owner key received from owner' : 'Registrar key received from registrar') : `Your ${side} key`;
        return <article key={sale.id} className="border rounded-xl p-4 space-y-2">
          <p className="font-semibold">{sale.parcel_id} <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${sale.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : sale.status === 'EXPIRED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}><span aria-hidden="true">●</span>{sale.status}</span></p>
          <p className="break-all text-xs">Request: {sale.id}</p>
          <p>Requested: {new Date(sale.created_at).toLocaleString()}</p>
          {sale.completed_at && <p className="text-green-700">● Transferred: {new Date(sale.completed_at).toLocaleString()}</p>}
          {sale.last_failure_at && <p className="text-red-700">● Last failed attempt: {new Date(sale.last_failure_at).toLocaleString()} · {sale.last_failure_reason}. View activity for every attempt.</p>}
          {sale.status === 'EXPIRED' && <p>Expired: {new Date(sale.expires_at).toLocaleString()}</p>}
          <p>Buyer: {sale.buyer_name || sale.buyer_username} ({sale.buyer_username}) {sale.buyer_phone && `· Phone: ${sale.buyer_phone}`} · Registrar: {sale.registrar_username}</p>
          {exchange && registrar && <p>Owner keys received: {sale.received_owner_keys}/{sale.required_owners}</p>}
          {!exchange && <p>Legacy request: each participant submits their own issued key.</p>}
          <p>Owners approved: {sale.approved_owners}/{sale.required_owners} · Registrar: {sale.registrar_approved ? 'Approved' : 'Pending'}</p>
          {sale.expires_at && <p>Deadline: {new Date(sale.expires_at).toLocaleString()}</p>}
          {sale.status === 'EXPIRED' && sale.cooldown_until && <p>New deals blocked until: {new Date(sale.cooldown_until).toLocaleString()}</p>}
          {sale.chain_state && <p>Blockchain receipt: {sale.chain_state}</p>}
          {sale.chain_tx_hash && <p className="break-all">Transaction hash: {sale.chain_tx_hash}</p>}
          {sale.chain_state && <button disabled={busy} className="underline" onClick={async () => {
            setBusy(true); setError('');
            try { const result = await activityApi(`/api/chain/sales/${sale.id}/refresh`, {}); setNotice(`Blockchain status: ${result.state}`); await reload(); }
            catch (failure) { setError(failure.message); } finally { setBusy(false); }
          }}>Refresh blockchain confirmation</button>}
          <SaleTimeline saleId={sale.id} />
          {canAct && <div className="flex flex-wrap gap-2">
            {!generated && (!approved || exchange) && <button disabled={busy} onClick={() => act(`/${sale.id}/keys/${side}`, {}, sale.id)} className="border rounded-lg p-2">Generate my {side} key</button>}
            {!approved && (exchange ? (registrar || generated) : generated) && <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); act(`/${sale.id}/approve/${side}`, { key: proofs[sale.id] || '' }); }}>
              <input type="password" autoComplete="off" placeholder={receivedKeyLabel} aria-label={`${receivedKeyLabel} for ${sale.parcel_id}`} required minLength={40} value={proofs[sale.id] || ''} onChange={(event) => setProofs({ ...proofs, [sale.id]: event.target.value })} className="border rounded-lg p-2" />
              <button disabled={busy} className="border rounded-lg p-2">{exchange ? 'Verify received key' : 'Submit my key'}</button>
            </form>}
            {registrar && sale.registrar_approved && sale.approved_owners === sale.required_owners && <button disabled={busy} onClick={() => act(`/${sale.id}/complete`, {})} className="bg-blue-600 text-white rounded-lg p-2">Submit transfer for confirmation</button>}
          </div>}
        </article>;
      })}
      <button disabled={busy} onClick={() => { setBusy(true); reload().catch((failure) => setError(failure.message)).finally(() => setBusy(false)); }} className="underline">Refresh requests</button>
    </section>
  );
}
