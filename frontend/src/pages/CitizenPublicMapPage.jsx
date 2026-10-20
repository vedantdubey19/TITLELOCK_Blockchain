import { useEffect, useState } from 'react';
import { CadastralLiveMap } from '../components/common/CadastralLiveMap';
import { ChainVerification } from '../components/ChainVerification';
import { activityApi } from '../services/saleService';

export function CitizenPublicMapPage() {
  const [search, setSearch] = useState('');
  const [parcels, setParcels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let cancelled = false;
    activityApi(`/api/properties/discover?search=${encodeURIComponent(search)}&offset=${offset}`).then((rows) => {
      if (cancelled) return;
      const records = rows.map((row) => ({ ...row, id: row.ulpin, surveyNumber: row.survey_number,
        currentOwner: row.current_owner, areaSqm: Number(row.area_sqm), registrationOffice: row.registration_office,
        status: row.title_status, statusVariant: row.frozen ? 'danger' : 'warning' }));
      setParcels(records); setSelected(records[0] || null); setError('');
    }).catch((failure) => { if (!cancelled) { setError(failure.message); setParcels([]); setSelected(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, offset]);
  const mapped = parcels.filter((p) => Array.isArray(p.boundary) && p.boundary.length >= 3);
  const ready = selected && selected.for_sale && !selected.frozen && !selected.deal_pending && !selected.cooldown_until
    && ['VERIFIED', 'VERIFIED_WITH_ENCUMBRANCE'].includes(selected.title_status);
  return <section className="space-y-4 text-slate-900">
    <h1 className="text-xl font-bold">Property explorer</h1>
    <label className="block">Search ULPIN or survey number
      <input value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); setLoading(true); }} className="block border rounded-lg p-2" />
    </label>
    {loading && <p role="status">Loading registry records…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {mapped.length ? <CadastralLiveMap parcels={mapped} activeParcel={mapped.find((p) => p.id === selected?.id) || mapped[0]}
      onSelectParcel={setSelected} height="420px" /> : <p>No surveyed map boundaries are stored for these records. Search and ownership records remain available below.</p>}
    <div className="flex flex-wrap gap-2">
      {parcels.map((parcel) => <button key={parcel.id} onClick={() => setSelected(parcel)} aria-pressed={selected?.id === parcel.id}
        className="border rounded-lg p-2">{parcel.id} · {parcel.for_sale ? 'Owner listed for sale' : 'Not listed'}</button>)}
    </div>
    {!loading && !parcels.length && !error && <p>No matching properties.</p>}
    <div className="flex gap-4">
      <button disabled={!offset} onClick={() => { setLoading(true); setOffset(Math.max(0, offset - 100)); }} className="underline">Previous records</button>
      <button disabled={parcels.length < 100} onClick={() => { setLoading(true); setOffset(offset + 100); }} className="underline">Next records</button>
    </div>
    {selected && <article className="bg-white border rounded-xl p-4 space-y-2">
      <h2 className="font-bold">ULPIN: {selected.id}</h2>
      <p>Current owner: {selected.current_owner || 'Not recorded'}</p>
      <p>Survey: {selected.survey_number || 'Not recorded'} · Area: {selected.area_sqm ?? 'Not recorded'} m²</p>
      <p>Registry title status: {selected.title_status} · Risk status: {selected.risk_status || 'Not recorded'}</p>
      <p>Frozen: {selected.frozen ? 'Yes' : 'No'} · Active deal: {selected.deal_pending ? 'Yes' : 'No'}</p>
      {selected.cooldown_until && <p>Sale cooldown until {new Date(selected.cooldown_until).toLocaleString()}</p>}
      <p>{ready ? 'Listed for sale · registrar must check blockchain and restrictions before proceeding' : 'Currently unavailable for a new listed sale'}</p>
      <ChainVerification key={selected.id} ulpin={selected.id} />
      <p>Give this ULPIN and your TitleLock username to the registrar to start a sale request.</p>
    </article>}
  </section>;
}
export default CitizenPublicMapPage;
