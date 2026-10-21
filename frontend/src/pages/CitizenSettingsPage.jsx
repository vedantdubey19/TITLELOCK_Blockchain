import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';
export function CitizenSettingsPage() {
  return <section className="space-y-4 text-slate-900">
    <h1 className="text-xl font-bold">Settings</h1>
    <div className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-bold">Appearance</h2><ThemeToggle /><p>Appearance is saved in this browser.</p></div>
    <div className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-bold">Account and security</h2>
      <Link to="/citizen/profile" className="underline">Edit profile, contact details and linked wallet</Link>
      <p>Account access uses your password and a server session. Property sales require the owner and registrar approvals enforced by the backend.</p>
      <p>Hardware-key registration, biometric verification, configurable session timeouts and government document integrations are not available.</p>
    </div>
    <Link to="/citizen/notifications" className="underline">View your registry notifications</Link>
  </section>;
}
export default CitizenSettingsPage;
