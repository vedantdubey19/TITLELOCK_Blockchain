import { useState } from 'react';
import { activityApi } from '../services/saleService';

export function ChainVerification({ ulpin }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await activityApi(`/api/chain/properties/${encodeURIComponent(ulpin)}/verify`)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="space-y-2 border rounded-xl p-3">
    <button disabled={busy} onClick={verify} className="underline">Verify ownership and anchored transfers against blockchain</button>
    {busy && <p role="status">Reading blockchain…</p>}
    {error && <p role="alert" className="text-amber-800">Verification unavailable: {error}</p>}
    {result && <div className={result.status === 'MATCH' ? 'text-green-700' : result.status === 'MISMATCH' ? 'text-red-700' : 'text-amber-800'}>
      <p className="font-bold">● {result.status === 'MATCH' ? 'Matches recorded blockchain history' : result.status === 'MISMATCH' ? 'Records differ — investigation required' : result.status.replaceAll('_', ' ')}</p>
      <p className="break-all text-xs">Database: {result.database_hash}</p>
      <p className="break-all text-xs">Blockchain: {result.blockchain_hash}</p>
    </div>}
  </section>;
}
