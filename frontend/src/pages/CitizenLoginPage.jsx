import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  ArrowRight, 
  Database, 
  UserPlus, 
  LogIn, 
  Award,
} from 'lucide-react';

function AadhaarField({ value, onChange }) {
  return (
    <label className="block text-xs text-slate-600 dark:text-slate-300">
      Aadhaar number
      <input type="password" inputMode="numeric" autoComplete="off" required pattern="[2-9][0-9]{11}"
        maxLength={12} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="12-digit Aadhaar number" title="Enter 12 digits starting with 2–9"
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800" />
      <span className="mt-1 block text-[11px]">Self-declared account information; not verified with UIDAI.</span>
    </label>
  );
}

export function CitizenLoginPage() {
  const { login, signup, verifyOTP, authLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'signin' | 'signup'
  const [tab, setTab] = useState('signin');

  const roleType = location.pathname.includes('/registrar') ? 'registrar' : 'citizen';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [aadhaar, setAadhaar] = useState('');

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [phoneLinkConfirmed, setPhoneLinkConfirmed] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupJurisdiction, setSignupJurisdiction] = useState('Gautam Buddha Nagar / Noida, UP');
  const [registrarCode, setRegistrarCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [emailCode, setEmailCode] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [notice, setNotice] = useState('');

  const handleSelectRole = (newRole) => {
    setIdentifier('');
    setPassword('');
    setAadhaar('');
    setError('');
    setPhoneLinkConfirmed(false);
    setChallenge(null);
    setEmailCode('');
    setSmsCode('');
    setNotice('');
    navigate(newRole === 'registrar' ? '/registrar/login' : '/citizen/login', { replace: true });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(identifier, password, roleType === 'registrar' ? 'REGISTRAR' : 'CITIZEN');
    setLoading(false);
    if (result.otp_required) {
      setChallenge(result);
      setPassword('');
      return;
    }
    if (result.success) {
      setPassword('');
      setAadhaar('');
      navigate(result.user.role === 'REGISTRAR' ? '/registrar/dashboard' : '/citizen/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!phoneLinkConfirmed || !/^(?:\+91[ -]?)?[6-9][0-9]{9}$/.test(signupPhone.trim())) {
      setError('Enter a valid Indian mobile number and confirm its ID linkage.');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = await signup({
      name: signupName, email: signupEmail, phone: signupPhone,
      password: signupPassword, jurisdiction: signupJurisdiction,
      role: roleType === 'registrar' ? 'REGISTRAR' : 'CITIZEN',
      registrarCode: roleType === 'registrar' ? registrarCode : '',
      ...(roleType === 'citizen' ? { aadhaar } : {}),
    });
    setLoading(false);
    if (result.login_required) {
      setTab('signin');
      setIdentifier(signupEmail);
      setSignupPassword('');
      setSignupConfirmPassword('');
      setAadhaar('');
      setNotice(result.message);
      return;
    }
    if (result.success) {
      setSignupPassword('');
      setSignupConfirmPassword('');
      setRegistrarCode('');
      setAadhaar('');
      navigate(result.user.role === 'REGISTRAR' ? '/registrar/dashboard' : '/citizen/dashboard');
    } else setError(result.message);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await verifyOTP({ challenge_id: challenge.challenge_id, email_code: emailCode, sms_code: smsCode });
    setLoading(false);
    if (result.success) {
      setEmailCode('');
      setSmsCode('');
      navigate(result.user.role === 'REGISTRAR' ? '/registrar/dashboard' : '/citizen/dashboard');
    } else setError(result.message);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080f1d] bg-mesh-subtle flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Institutional Top Indicator & Theme Switcher */}
      <div className="w-full max-w-lg mx-auto mb-5 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-mono shadow-xs backdrop-blur-md">
          <Database className="w-3.5 h-3.5 text-[#0b6b4e] dark:text-emerald-400" />
          <span className="truncate">TitleLock Cadastre Ledger • Section 5 Protocol</span>
        </div>
        <ThemeToggle size="sm" />
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_4px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border border-slate-100/90 dark:border-white/10 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-100 dark:border-emerald-800/50 mx-auto flex items-center justify-center text-[#0b6b4e] dark:text-emerald-400 mb-3 shadow-xs">
            {roleType === 'registrar' ? (
              <Building2 className="w-6 h-6 text-[#0b6b4e] dark:text-emerald-400" />
            ) : (
              <Shield className="w-6 h-6 text-[#0b6b4e] dark:text-emerald-400" />
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {roleType === 'registrar' ? 'Sub-Registrar Portal' : 'Department of Land Records & Titles'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {roleType === 'registrar' 
              ? 'Official Statutory Conveyance & Deed Execution Console'
              : 'Government of India • Citizen Landholder Portal'}
          </p>
        </div>

        {/* Tab switch: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setChallenge(null);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'signin'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setChallenge(null);
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Alert */}
        {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
        {(error || authError) && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
            <span>{error || authError}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {tab === 'signin' && !challenge && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                {roleType === 'registrar' ? 'Officer Email or Staff ID' : 'Citizen Email or Username'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="Email or username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e] focus:ring-1 focus:ring-[#0b6b4e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Access Key (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e] focus:ring-1 focus:ring-[#0b6b4e]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-[#0b6b4e] hover:bg-[#08523c] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading 
                ? 'Authenticating Identity...' 
                : (roleType === 'registrar' ? 'Sign In to Registrar Gateway' : 'Sign In with Cadastre ID')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* TAB 2: SIGN UP */}
        {tab === 'signin' && challenge && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Enter the separate codes sent to {challenge.email_hint} and {challenge.phone_hint}. Codes expire in five minutes.</p>
            <label className="block text-sm">Email code
              <input aria-label="Email code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))} className="block w-full rounded-xl border p-2 text-slate-800" />
            </label>
            <label className="block text-sm">SMS code
              <input aria-label="SMS code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))} className="block w-full rounded-xl border p-2 text-slate-800" />
            </label>
            <button disabled={loading} className="rounded-xl bg-emerald-800 px-4 py-2 text-white">{loading ? 'Verifying…' : 'Verify and sign in'}</button>
            <button type="button" disabled={loading} onClick={() => { setChallenge(null); setEmailCode(''); setSmsCode(''); setError(''); }} className="block text-sm underline">
              Restart login to request new codes
            </button>
          </form>
        )}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            {roleType === 'citizen' && <AadhaarField value={aadhaar} onChange={setAadhaar} />}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                  placeholder={roleType === 'registrar' ? 'e.g. Virendra Swarup' : 'e.g. Ramesh Chandra Verma'}
                  className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    placeholder="name@titlelock.gov.in"
                    className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  {roleType === 'registrar' ? 'Government ID registered mobile' : 'Aadhaar-linked mobile'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    pattern="(\+91[ -]?)?[6-9][0-9]{9}"
                    title="Enter a 10-digit Indian mobile number, optionally prefixed with +91."
                    placeholder="9876543210 or +91 9876543210"
                    className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={phoneLinkConfirmed}
                  onChange={(e) => setPhoneLinkConfirmed(e.target.checked)}
                  required
                  className="mt-0.5"
                />
                <span>
                  {roleType === 'registrar'
                    ? 'I confirm this mobile number is registered with my government officer ID.'
                    : 'I confirm this mobile number is linked to my Aadhaar.'}
                </span>
              </label>
              <p className="text-[11px] text-slate-500">This is your declaration. TitleLock has not verified the ID linkage. Do not enter your Aadhaar or officer ID number here.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                {roleType === 'registrar' ? 'Sub-Registrar Jurisdiction' : 'Land District / Tehsil'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={signupJurisdiction}
                  onChange={(e) => setSignupJurisdiction(e.target.value)}
                  placeholder="e.g. Gautam Buddha Nagar / Noida, UP"
                  className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                />
              </div>
            </div>

            {roleType === 'registrar' && (
              <div>
                <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Officer Verification Code</span>
                  <span className="text-[10px] text-slate-400 font-normal">Gov Authorization</span>
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={registrarCode}
                    onChange={(e) => setRegistrarCode(e.target.value)}
                    placeholder="Enter your private officer authorization code"
                    className="w-full pl-10 pr-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-amber-300 bg-amber-50/50 text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-[#0b6b4e] hover:bg-[#08523c] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 pt-2.5"
            >
              {loading 
                ? 'Registering Cryptographic Identity...' 
                : (roleType === 'registrar' ? 'Create Sub-Registrar Authority Account' : 'Complete Citizen Registration')}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* BOTTOM SECTION: Option for Citizen vs Registrar */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="text-center text-xs text-slate-500">
            {roleType === 'citizen' ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-[11px]">Are you a Sub-Registrar Officer?</div>
                    <div className="text-[10px] text-slate-500">Access statutory conveyance review console</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectRole('registrar')}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 transition-colors cursor-pointer text-[11px] whitespace-nowrap shadow-xs"
                >
                  {tab === 'signin' ? 'Sign In as Registrar ➔' : 'Sign Up as Registrar ➔'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-[11px]">Citizen Landholder?</div>
                    <div className="text-[10px] text-slate-600">Access citizen titleholdings, RoR & sell tokens</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectRole('citizen')}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-100 transition-colors cursor-pointer text-[11px] whitespace-nowrap shadow-xs"
                >
                  {tab === 'signin' ? 'Sign In as Citizen ➔' : 'Sign Up as Citizen ➔'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default CitizenLoginPage;
