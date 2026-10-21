import { useState } from 'react';
import { useApiResource } from '../hooks/useApiResource';
import { activityApi } from '../services/saleService';

export function RegistrarRiskPage() {
  const [parcel, setParcel] = useState('');
  const [filter, setFilter] = useState('');
  const [cursor, setCursor] = useState('');
  const [holdCursor, setHoldCursor] = useState('');
  const [includeResolved, setIncludeResolved] = useState(false);
  const assessments = useApiResource(`/api/risk/assessments?parcel_id=${encodeURIComponent(filter)}${cursor ? `&before=${cursor}` : ''}`);
  const holds = useApiResource(`/api/risk/holds?include_resolved=${includeResolved}${holdCursor ? `&before=${holdCursor}` : ''}`);
  const [form, setForm] = useState({ parcel_id: '', buyer_username: '', document_hash: '' });
  const [action, setAction] = useState(null);
  const [evidence, setEvidence] = useState({ reason: '', evidence_reference: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      if (action) {
        await activityApi(action.path, evidence); setAction(null); setEvidence({ reason: '', evidence_reference: '' });
        setResult('Risk hold updated.');
      } else {
        const row = await activityApi('/api/risk/assessments', form);
        setResult(`Assessment ${row.id}: ${row.decision} · risk points ${row.score}/100`);
        setFilter(form.parcel_id.trim()); setParcel(form.parcel_id.trim()); setCursor('');
      }
      assessments.refresh(); holds.refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const begin = (label, path) => { setAction({ label, path }); setEvidence({ reason: '', evidence_reference: '' }); setError(''); setResult(null); };
  return <section className="space-y-4 text-slate-900">
    <h1 className="text-xl font-bold">Risk assessments and review holds</h1>
    <p>Rule-based screening of ownership, legal restrictions, workflow conflicts, document reuse and blockchain integrity. Risk points are not a probability or proof of legal title.</p>
    <form onSubmit={submit} className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-bold">{action?.label || 'Run a sale risk assessment'}</h2>
      {action ? <>{[['reason','Reason'],['evidence_reference','Evidence reference']].map(([key,label]) => <label key={key} className="block">{label}
        <input required minLength={5} maxLength={500} value={evidence[key]} onChange={(event) => setEvidence({ ...evidence, [key]: event.target.value })} className="block border rounded-lg p-2 w-full" disabled={busy} />
      </label>)}</> : <>{[['parcel_id','Property ULPIN',150],['buyer_username','Buyer username',64],['document_hash','Document hash / reference',200]].map(([key,label,max]) => <label key={key} className="block">{label}
        <input required minLength={key === 'document_hash' ? 8 : key === 'buyer_username' ? 3 : 1} maxLength={max} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="block border rounded-lg p-2 w-full" disabled={busy} />
      </label>)}</>}
      <button disabled={busy} className="border rounded-lg p-2">{busy ? 'Saving…' : action ? 'Save review action' : 'Run assessment'}</button>
      {action && <button type="button" disabled={busy} onClick={() => setAction(null)} className="underline ml-4">Cancel</button>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {result && <p role="status">{result}</p>}
    </form>
    <form onSubmit={(event) => { event.preventDefault(); setFilter(parcel.trim()); setCursor(''); assessments.refresh(); }} className="flex gap-2 flex-wrap">
      <label>Filter assessments by ULPIN <input value={parcel} onChange={(event) => setParcel(event.target.value)} className="border rounded-lg p-2" /></label>
      <button className="underline">Search / refresh</button>
    </form>
    <h2 className="font-bold">Saved assessments</h2>
    {assessments.loading && <p role="status">Loading assessments…</p>}
    {assessments.error && <p role="alert" className="text-red-700">{assessments.error}</p>}
    {assessments.data?.length === 0 && <p>No matching assessments.</p>}
    {assessments.data?.map((item) => <article key={item.id} className="bg-white border rounded-xl p-4 space-y-2">
      <h3 className="font-bold">{item.parcel_id} · <span className={item.decision === 'CLEAR' ? 'text-green-700' : 'text-red-700'}>{item.decision}</span> · {item.score}/100 risk points</h3>
      <p className="text-sm break-all">Assessment: {item.id} · Document: {item.document_hash}</p>
      <p className="text-sm">{new Date(item.created_at).toLocaleString()} · Expires {new Date(item.expires_at).toLocaleString()} · {item.consumed_by ? 'Used by a sale' : 'Not consumed'}</p>
      <ul>{item.findings.map((finding) => <li key={finding.rule}>{finding.rule}: {finding.blocked ? 'BLOCKED' : 'Passed'} {finding.status && `· ${finding.status}`}</li>)}</ul>
      <button disabled={busy} onClick={() => begin(`Open a hold for ${item.parcel_id}`, `/api/risk/assessments/${item.id}/hold`)} className="underline">Open review hold</button>
    </article>)}
    <div className="flex gap-4"><button disabled={!cursor || assessments.loading} onClick={() => setCursor('')} className="underline">Latest assessments</button>
      <button disabled={assessments.loading || assessments.data?.length !== 50} onClick={() => setCursor(assessments.data.at(-1).id)} className="underline">Older assessments</button></div>
    <h2 className="font-bold">Review holds</h2>
    <label><input type="checkbox" checked={includeResolved} onChange={(event) => { setIncludeResolved(event.target.checked); setHoldCursor(''); }} /> Include resolved holds</label>
    <button onClick={holds.refresh} className="underline ml-4">Refresh holds</button>
    {holds.loading && <p role="status">Loading holds…</p>}
    {holds.error && <p role="alert" className="text-red-700">{holds.error}</p>}
    {holds.data?.length === 0 && <p>No matching holds.</p>}
    {holds.data?.map((item) => <article key={item.id} className="bg-white border rounded-xl p-4 space-y-2">
      <h3 className="font-bold">{item.parcel_id} · {item.resolved_at ? 'Resolved' : 'Active hold'}</h3>
      <p>{item.reason} · Evidence: {item.evidence_reference}</p><p>{new Date(item.created_at).toLocaleString()}</p>
      {item.resolved_at ? <p>Resolved {new Date(item.resolved_at).toLocaleString()} · {item.resolution_reference}</p> : <button disabled={busy} onClick={() => begin(`Resolve hold for ${item.parcel_id}`, `/api/risk/holds/${item.id}/resolve`)} className="underline">Resolve hold</button>}
    </article>)}
    <div className="flex gap-4"><button disabled={!holdCursor || holds.loading} onClick={() => setHoldCursor('')} className="underline">Latest holds</button>
      <button disabled={holds.loading || holds.data?.length !== 50} onClick={() => setHoldCursor(holds.data.at(-1).id)} className="underline">Older holds</button></div>
    <p>Resolving a review hold does not clear a court freeze, dispute or another sale restriction.</p>
  </section>;
}
export default RegistrarRiskPage;
