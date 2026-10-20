import { activityApi } from '../services/saleService';
import { ChainVerification } from './ChainVerification';
import { useEffect, useState } from 'react';

export function PropertyRecord({ ulpin }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [listingMessage, setListingMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/properties/${encodeURIComponent(ulpin)}`, {
      credentials: 'same-origin', signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Could not load property details');
      if (!controller.signal.aborted) setRecord(body);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [ulpin]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!record) return <p role="status">Loading property record…</p>;

  const fields = {
    'Current owner': record.current_owner,
    'Survey number': record.survey_number,
    'Registered area (m²)': record.area_sqm,
    'Registration office': record.registration_office,
    'Last registered': record.last_registered_date,
    'Ownership type': record.ownership_type,
    'Title status': record.title_status,
    'Risk status': record.risk_status,
    Frozen: record.frozen ? 'Yes' : 'No',
    'Freeze reason': record.freeze_reason,
  };

  return (
    <div className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
      <ChainVerification ulpin={ulpin} />
      <div className="flex flex-wrap gap-3">
        {[true, false].map((for_sale) => <button key={String(for_sale)} className="underline" onClick={async () => {
          try { const result = await activityApi(`/api/properties/${encodeURIComponent(ulpin)}/availability`, { for_sale }); setListingMessage(result.message); }
          catch (failure) { setListingMessage(failure.message); }
        }}>{for_sale ? 'Agree to advertise for sale' : 'Withdraw my sale listing consent'}</button>)}
      </div>
      {listingMessage && <p role="status">{listingMessage}</p>}
      <dl className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
        {Object.entries(fields).map(([label, value]) => (
          <div key={label}><dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-900 break-words">{value ?? 'Not recorded'}</dd></div>
        ))}
      </dl>
      <section>
        <h4 className="font-bold mb-2">Registered owners</h4>
        {record.owners.length ? record.owners.map((owner, index) => (
          <p key={index}>{owner.name || 'Name not recorded'} · {owner.share_bps == null ? 'Share not recorded' : `${owner.share_bps / 100}%`}</p>
        )) : <p>No active owners recorded.</p>}
      </section>
      {['encumbrances', 'disputes'].map((kind) => (
        <section key={kind}>
          <h4 className="font-bold capitalize mb-2">{kind}</h4>
          {record[kind].length ? record[kind].map((entry) => (
            <div key={entry.id} className="p-3 mb-2 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-semibold">{entry.status || 'Status not recorded'}</p>
              {Object.entries(entry.details || {}).map(([key, value]) => (
                <p key={key} className="break-words"><span className="capitalize">{key.replaceAll('_', ' ')}</span>: {typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
              ))}
            </div>
          )) : <p>No {kind} recorded.</p>}
        </section>
      ))}
      <section>
        <h4 className="font-bold mb-2">Conveyance history</h4>
        {(record.transfer_history || []).length ? record.transfer_history.map((entry, index) => (
          <div key={index} className="p-3 mb-2 bg-slate-50 rounded-xl border border-slate-100">
            <p>{entry.from || 'Not recorded'} → {entry.to || 'Not recorded'} · {entry.date || 'Date not recorded'}</p>
            <p className="font-mono break-all">Document hash: {entry.doc_hash || 'Not recorded'}</p>
          </div>
        )) : <p>No transfer history recorded.</p>}
      </section>
    </div>
  );
}
