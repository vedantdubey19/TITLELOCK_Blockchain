import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApiResource } from '../hooks/useApiResource';
import { activityApi } from '../services/saleService';

function CaseEvents({ id }) {
  const [cursor, setCursor] = useState('');
  const events = useApiResource(`/api/succession/${id}/events${cursor ? `?before_id=${cursor}` : ''}`);
  return <div className="border rounded-lg p-3 space-y-2">
    <h3 className="font-bold">Case history</h3>
    {events.loading && <p role="status">Loading history…</p>}
    {events.error && <p role="alert">{events.error}</p>}
    {events.data?.map((event) => <p key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.action} · {event.note}</p>)}
    <button disabled={!cursor || events.loading} onClick={() => setCursor('')} className="underline mr-4">Latest events</button>
    <button disabled={events.loading || events.data?.length !== 50} onClick={() => setCursor(events.data.at(-1).id)} className="underline">Older events</button>
  </div>;
}

export function RegistrarSuccessionPage() {
  const { currentUser } = useAuth();
  const registrar = currentUser?.role === 'REGISTRAR';
  const [cursor, setCursor] = useState('');
  const cases = useApiResource(`/api/succession${cursor ? `?before=${cursor}` : ''}`);
  const [form, setForm] = useState({ parcel_id: '', deceased_user_id: '', death_certificate_reference: '', legal_heir_reference: '', document_hash: '' });
  const [heirs, setHeirs] = useState([{ username: '', share_bps: '' }]);
  const [owners, setOwners] = useState(null);
  const [review, setReview] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const act = async (path, data) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await activityApi(path, data);
      setMessage(result.message || `Case status: ${result.status}`); setReview(null); cases.refresh();
      setHistory(null);
      return true;
    } catch (failure) { setError(failure.message); return false; }
    finally { setBusy(false); }
  };
  const lookup = async () => {
    setBusy(true); setError(''); setOwners(null);
    try { setOwners(await activityApi(`/api/succession/properties/${encodeURIComponent(form.parcel_id.trim())}/owners`)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 text-slate-900">
    <h1 className="text-xl font-bold">Succession claims and evidence review</h1>
    <p>Evidence review does not transfer ownership or submit a blockchain transaction. Transfer authority after an owner's death is awaiting a policy decision.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    {!registrar && <form onSubmit={async (event) => {
      event.preventDefault();
      if (await act('/api/succession', { ...form, heirs: heirs.map((heir) => ({ ...heir, share_bps: Number(heir.share_bps) })) })) {
        setForm({ parcel_id: '', deceased_user_id: '', death_certificate_reference: '', legal_heir_reference: '', document_hash: '' });
        setHeirs([{ username: '', share_bps: '' }]); setOwners(null); setCursor('');
      }
    }} className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-bold">File a claim as a proposed heir or surviving co-owner</h2>
      {[["parcel_id","Property ULPIN",150],["deceased_user_id","Deceased owner's registry UUID",36],["death_certificate_reference","Death certificate reference",500],["legal_heir_reference","Legal heir / court evidence reference",500],["document_hash","Document SHA-256 hash (64 hexadecimal characters)",64]].map(([key,label,max]) => <label key={key} className="block">{label}
        <input required value={form[key]} maxLength={max} pattern={key === 'document_hash' ? '[a-fA-F0-9]{64}' : undefined} disabled={busy}
          onChange={(event) => { setForm({ ...form, [key]: event.target.value }); if (key === 'parcel_id') setOwners(null); }} className="block border rounded-lg p-2 w-full" />
      </label>)}
      <button type="button" disabled={busy || !form.parcel_id.trim()} onClick={lookup} className="underline">Look up owners for a property you may access</button>
      <p>If you cannot access the owner list, obtain the deceased owner's registry reference through the registrar and your supporting evidence.</p>
      {owners?.map((owner) => <p key={owner.registry_user_id} className="break-all">{owner.display_name} · {owner.registry_user_id} · {owner.share_bps / 100}%</p>)}
      <p>Heir shares must add up to the deceased owner's share. Enter basis points: 10,000 = 100%.</p>
      {heirs.map((heir,index) => <div key={index} className="flex flex-wrap gap-2">
        <label>Heir username <input required minLength={3} maxLength={64} disabled={busy} value={heir.username} onChange={(event) => setHeirs(heirs.map((value,i) => i === index ? { ...value, username: event.target.value } : value))} className="border rounded-lg p-2" /></label>
        <label>Share (basis points) <input required type="number" min={1} max={10000} step={1} disabled={busy} value={heir.share_bps} onChange={(event) => setHeirs(heirs.map((value,i) => i === index ? { ...value, share_bps: event.target.value } : value))} className="border rounded-lg p-2" /></label>
        <button type="button" disabled={busy || heirs.length === 1} onClick={() => setHeirs(heirs.filter((_,i) => i !== index))} className="underline">Remove heir</button>
      </div>)}
      <button type="button" disabled={busy || heirs.length >= 20} onClick={() => setHeirs([...heirs, { username: '', share_bps: '' }])} className="underline mr-4">Add heir</button>
      <button disabled={busy} className="border rounded-lg p-2">{busy ? 'Saving…' : 'Submit evidence for review'}</button>
    </form>}
    <button disabled={cases.loading || busy} onClick={cases.refresh} className="underline">Refresh cases</button>
    {cases.loading && <p role="status">Loading cases…</p>}
    {cases.error && <p role="alert" className="text-red-700">{cases.error}</p>}
    {cases.data?.length === 0 && <p>No succession cases available.</p>}
    {cases.data?.map((item) => <article key={item.id} className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-bold">{item.parcel_id} · {item.status.replaceAll('_',' ')}</h2>
      <p className="text-sm break-all">Case: {item.id} · Filed {new Date(item.created_at).toLocaleString()}</p>
      <p className="break-all">Deceased registry ID: {item.deceased_user_id}</p>
      <p>Proposed heirs: {item.heirs.map((heir) => `${heir.name} (${heir.username}) · ${heir.share_bps / 100}%`).join('; ')}</p>
      <p>Death certificate: {item.death_certificate_reference}</p><p>Legal heir evidence: {item.legal_heir_reference}</p>
      <p className="break-all">Document hash: {item.document_hash}</p>
      {item.review_note && <p>Review: {item.review_note} · {new Date(item.reviewed_at).toLocaleString()}</p>}
      {registrar && ['SUBMITTED','IN_REVIEW','EVIDENCE_VERIFIED'].includes(item.status) && item.assigned_registrar_id !== currentUser.id && <button disabled={busy} onClick={() => act(`/api/succession/${item.id}/assign`, {})} className="underline mr-4">{item.status === 'SUBMITTED' ? 'Assign to me for review' : 'Request reassignment if reviewer is inactive'}</button>}
      {registrar && item.assigned_registrar_id === currentUser.id && ['IN_REVIEW','EVIDENCE_VERIFIED'].includes(item.status) && <button disabled={busy} onClick={() => setReview({ id: item.id, decision: item.status === 'EVIDENCE_VERIFIED' ? 'REJECTED' : 'EVIDENCE_VERIFIED', evidence_reference: '', note: '' })} className="underline mr-4">Record evidence decision</button>}
      {!registrar && item.applicant_user_id === currentUser.id && item.status === 'SUBMITTED' && <button disabled={busy} onClick={() => act(`/api/succession/${item.id}/withdraw`, {})} className="underline mr-4">Withdraw submitted claim</button>}
      <button onClick={() => setHistory(history === item.id ? null : item.id)} className="underline">{history === item.id ? 'Hide' : 'Show'} case history</button>
      {history === item.id && <CaseEvents key={item.id} id={item.id} />}
      {review?.id === item.id && <form onSubmit={(event) => { event.preventDefault(); const { id, ...data } = review; act(`/api/succession/${id}/review`, data); }} className="space-y-3 border rounded-lg p-3">
        <label>Decision <select disabled={busy} value={review.decision} onChange={(event) => setReview({ ...review, decision: event.target.value })} className="border p-2 rounded-lg">
          {item.status === 'IN_REVIEW' && <option value="EVIDENCE_VERIFIED">Evidence verified (no transfer)</option>}<option value="REJECTED">Reject claim</option>
        </select></label>
        {['evidence_reference','note'].map((key) => <label key={key} className="block">{key === 'note' ? 'Review note' : 'Reviewed evidence reference'}
          <input required minLength={5} maxLength={500} disabled={busy} value={review[key]} onChange={(event) => setReview({ ...review, [key]: event.target.value })} className="block border rounded-lg p-2 w-full" />
        </label>)}
        <button disabled={busy} className="border rounded-lg p-2">Save decision</button>
        <button type="button" disabled={busy} onClick={() => setReview(null)} className="underline ml-4">Cancel</button>
      </form>}
    </article>)}
    <div className="flex gap-4"><button disabled={!cursor || cases.loading} onClick={() => setCursor('')} className="underline">Latest cases</button>
      <button disabled={cases.loading || cases.data?.length !== 50} onClick={() => setCursor(cases.data.at(-1).id)} className="underline">Older cases</button></div>
  </section>;
}
export default RegistrarSuccessionPage;
