import { useEffect, useState } from 'react';
import { activityApi } from '../services/saleService';
import { linkWallet } from '../services/walletService';

export function LocalWalletPanel({ onMode }) {
  const [address, setAddress] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    Promise.all([activityApi('/api/health'), activityApi('/api/chain/wallet')]).then(([health, wallet]) => {
      if (!cancelled) { setEnabled(health.chain_mode === 'live'); onMode(health.chain_mode === 'live'); setAddress(wallet.address); }
    }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [onMode]);
  const connect = async () => {
    setBusy(true); setError('');
    try { setAddress((await linkWallet()).address); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  if (!enabled) return error ? <p role="alert">{error}</p> : null;
  return <div className="p-3 border rounded-xl space-y-2">
    <p className="font-bold">MetaMask · test network</p>
    <p>{address ? `Linked wallet: ${address}` : 'Link a separate wallet for each owner, buyer, and registrar account.'}</p>
    {!address && <button disabled={busy} onClick={connect} className="border rounded-lg p-2">Link my MetaMask wallet</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
