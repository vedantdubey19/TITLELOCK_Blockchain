import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LocalWalletPanel } from '../components/LocalWalletPanel';
const fields = [['name','Full name',120],['email','Email',254],['phone','Mobile number',32],['jurisdiction','Jurisdiction',200],['description','About you',500],['residentialAddress','Residential address',500],['primaryNomineeName','Preferred nominee name',120],['nomineeRelation','Nominee relationship',80],['emergencyContact','Emergency contact',32],['recoveryGuardian','Recovery contact',120]];
const ignoreMode = () => {};
export function CitizenProfilePage() {
  const { currentUser: user, updateProfile } = useAuth();
  const initial = () => Object.fromEntries(fields.map(([key]) => [key, user?.[key] ?? user?.profile?.[key] ?? '']));
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      await updateProfile({ ...form, ...(password ? { currentPassword: password } : {}) });
      setPassword(''); setSaved(true);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 text-slate-900">
    <h1 className="text-xl font-bold">{user?.role === 'REGISTRAR' ? 'Registrar profile' : 'Citizen profile'}</h1>
    <div className="bg-white border rounded-xl p-4 space-y-2">
      <p>Username: {user?.username} · Account status: {user?.status}</p>
      <p>Email: {user?.emailVerified ? 'Verified' : 'Not verified'} · Mobile: {user?.phoneVerified ? 'Verified' : 'Not verified'}</p>
      {user?.role === 'REGISTRAR' ? <p>Officer review: {user.officerVerified ? 'Approved by operator' : 'Pending'}</p> : <p>Aadhaar: {user?.aadhaarLast4 ? `XXXX-XXXX-${user.aadhaarLast4}` : 'Not provided'} · Self-declared; UIDAI verification is unavailable.</p>}
    </div>
    <form onSubmit={save} className="bg-white border rounded-xl p-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">{fields.map(([key,label,maxLength]) => <label key={key}>{label}
        <input className="block border rounded-lg p-2 w-full" value={form[key]} maxLength={maxLength}
          type={key === 'email' ? 'email' : 'text'} required={['name','email'].includes(key)}
          disabled={busy || (key === 'jurisdiction' && user?.role === 'REGISTRAR')}
          onChange={(event) => { setSaved(false); setForm({ ...form, [key]: event.target.value }); }} />
      </label>)}</div>
      <p>Nominee and recovery contacts are profile preferences. They do not grant ownership or legal succession rights.</p>
      <label>Current password (required when changing email or mobile)
        <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="block border rounded-lg p-2" disabled={busy} />
      </label>
      <p>Changing email or mobile signs out all sessions and resets verification for the changed contact.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {saved && <p role="status" className="text-green-700">Profile saved.</p>}
      <button disabled={busy} className="border rounded-lg p-2">{busy ? 'Saving…' : 'Save profile'}</button>
      <button type="button" disabled={busy} onClick={() => { setForm(initial()); setPassword(''); setError(''); setSaved(false); }} className="underline ml-4">Discard edits</button>
    </form>
    <LocalWalletPanel onMode={ignoreMode} />
  </section>;
}
export default CitizenProfilePage;
