import { Link } from 'react-router-dom';
export function CitizenRecoveryPage() {
  return <section className="space-y-4 text-slate-900"><h1 className="text-xl font-bold">Key recovery</h1>
    <p>Wallet recovery and credential replacement are not available in this application yet.</p>
    <p>If an issued sale key expires after 24 hours, that deal expires and the property enters a seven-day sale cooldown. Check the actual deal status in your transaction history.</p>
    <Link to="/citizen/transactions" className="underline">View sale status and cooldown dates</Link>
  </section>;
}
export default CitizenRecoveryPage;
