import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CadastreDatabaseService } from '../services/databaseService';
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
  CheckCircle2,
  Sparkles,
  Layers,
  Fingerprint,
  Users
} from 'lucide-react';

export function CitizenLoginPage() {
  const { login, signup, showToast } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'signin' | 'signup'
  const [tab, setTab] = useState('signin');

  // Role Type: 'citizen' | 'registrar'
  const [roleType, setRoleType] = useState(() => {
    return location.pathname.includes('/registrar') ? 'registrar' : 'citizen';
  });

  // Keep roleType in sync with route if user navigated directly
  useEffect(() => {
    if (location.pathname.includes('/registrar')) {
      setRoleType('registrar');
      setIdentifier('registrar.noida@titlelock.gov.in');
      setPassword('Registrar@001');
    } else {
      setRoleType('citizen');
      setIdentifier('rajesh.kumar@titlelock.gov.in');
      setPassword('Demo@001');
    }
  }, [location.pathname]);

  // Sign In Form State
  const [identifier, setIdentifier] = useState(() => {
    return location.pathname.includes('/registrar') 
      ? 'registrar.noida@titlelock.gov.in' 
      : 'rajesh.kumar@titlelock.gov.in';
  });
  const [password, setPassword] = useState(() => {
    return location.pathname.includes('/registrar') ? 'Registrar@001' : 'Demo@001';
  });

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupJurisdiction, setSignupJurisdiction] = useState('Gautam Buddha Nagar / Noida, UP');
  const [registrarCode, setRegistrarCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Demo accounts catalog for both roles
  const citizenDemoAccounts = [
    {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@titlelock.gov.in',
      pass: 'Demo@001',
      desc: 'Primary Titleholder (8 properties, UP-0012)',
      badge: 'Owner'
    },
    {
      name: 'Radha Sharma',
      email: 'radha.sharma@titlelock.gov.in',
      pass: 'Demo@001',
      desc: 'Multiple Titleholder (UP-0041 & UP-0053 Frozen)',
      badge: 'Owner'
    },
    {
      name: 'Meena Gupta',
      email: 'meena.gupta@titlelock.gov.in',
      pass: 'Demo@002',
      desc: 'Bank Lien Encumbrance (UP-0019) & Joint (UP-0020)',
      badge: 'Lien/Joint'
    },
    {
      name: 'Jyoti Bhati',
      email: 'jyoti.bhati@titlelock.gov.in',
      pass: 'Demo@003',
      desc: 'Owner (UP-0049) & Nominee for UP-0012',
      badge: 'Nominee'
    },
    {
      name: 'Geeta Goel',
      email: 'geeta.goel@titlelock.gov.in',
      pass: 'Demo@004',
      desc: 'Prospective Buyer with active deed petition',
      badge: 'Buyer'
    }
  ];

  const registrarDemoAccounts = [
    {
      name: 'Virendra Swarup',
      email: 'registrar.noida@titlelock.gov.in',
      pass: 'Registrar@001',
      desc: 'Sub-Registrar Officer • Tehsil Dadri / Noida-I',
      badge: 'Sub-Registrar'
    },
    {
      name: 'Dr. Anand Prakash',
      email: 'subregistrar.dadri@titlelock.gov.in',
      pass: 'Registrar@002',
      desc: 'District Registrar & Statutory Deed Adjudicator',
      badge: 'District Reg.'
    }
  ];

  // Helper to quickly apply demo credentials
  const handleApplyDemoAccount = (acc) => {
    setIdentifier(acc.email);
    setPassword(acc.pass);
    setError('');
    showToast(`Loaded credentials for ${acc.name} (${acc.badge})`, 'info');
  };

  // Switch between citizen and registrar modes
  const handleSelectRole = (newRole) => {
    setRoleType(newRole);
    setError('');
    if (newRole === 'registrar') {
      navigate('/registrar/login', { replace: true });
      if (tab === 'signin') {
        setIdentifier('registrar.noida@titlelock.gov.in');
        setPassword('Registrar@001');
      } else {
        setSignupJurisdiction('Sub-Registrar Noida-I, UP');
      }
    } else {
      navigate('/citizen/login', { replace: true });
      if (tab === 'signin') {
        setIdentifier('rajesh.kumar@titlelock.gov.in');
        setPassword('Demo@001');
      } else {
        setSignupJurisdiction('Gautam Buddha Nagar / Noida, UP');
      }
    }
  };

  // Sign In Handler with strict role enforcement
  const handleSignIn = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const expectedRole = roleType === 'registrar' ? 'REGISTRAR' : 'CITIZEN';

    setTimeout(() => {
      const res = login(identifier, password, expectedRole);
      setLoading(false);
      if (res.success) {
        if (roleType === 'registrar' || res.user?.role === 'REGISTRAR' || res.user?.activeRole === 'REGISTRAR') {
          navigate('/registrar/dashboard');
        } else {
          navigate('/citizen/dashboard');
        }
      } else {
        setError(res.message);
      }
    }, 250);
  };

  // Sign Up Handler
  const handleSignUp = (e) => {
    e.preventDefault();
    setError('');

    if (!signupName.trim()) {
      setError('Please enter your full legal name');
      return;
    }
    if (!signupEmail.trim()) {
      setError('Please enter a valid email address');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (roleType === 'registrar' && registrarCode !== 'REG-GOV-2026') {
      setError('Official authorization code required for Sub-Registrar accounts. (Hint: Use REG-GOV-2026)');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const newUserData = {
        name: signupName,
        email: signupEmail,
        phone: signupPhone || '+91 98765 43210',
        password: signupPassword,
        role: roleType === 'registrar' ? 'REGISTRAR' : 'CITIZEN',
        activeRole: roleType === 'registrar' ? 'REGISTRAR' : 'OWNER',
        jurisdiction: signupJurisdiction,
        description: roleType === 'registrar' 
          ? `Sub-Registrar Authority • ${signupJurisdiction}`
          : 'Verified Citizen Titleholder under Section 5 Cadastre'
      };

      const res = signup(newUserData);
      setLoading(false);
      if (res.success) {
        if (roleType === 'registrar') {
          navigate('/registrar/dashboard');
        } else {
          navigate('/citizen/dashboard');
        }
      } else {
        setError(res.message);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-mesh-subtle flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 transition-colors">
      
      {/* Institutional Top Indicator */}
      <div className="w-full max-w-lg mx-auto mb-5 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 text-slate-700 text-xs font-mono shadow-xs backdrop-blur-md">
          <Database className="w-3.5 h-3.5 text-[#0b6b4e]" />
          <span>TitleLock Cadastre Ledger • Section 5 State Registry Protocol</span>
        </div>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_4px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100/90 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 mx-auto flex items-center justify-center text-[#0b6b4e] mb-3 shadow-xs">
            {roleType === 'registrar' ? (
              <Building2 className="w-6 h-6 text-[#0b6b4e]" />
            ) : (
              <Shield className="w-6 h-6 text-[#0b6b4e]" />
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {roleType === 'registrar' ? 'Sub-Registrar Portal' : 'Department of Land Records & Titles'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {roleType === 'registrar' 
              ? 'Official Statutory Conveyance & Deed Execution Console'
              : 'Government of India • Citizen Landholder Portal'}
          </p>
        </div>

        {/* Tab switch: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'signin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
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
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {tab === 'signin' && (
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
                  placeholder={roleType === 'registrar' ? 'registrar.noida@titlelock.gov.in' : 'rajesh.kumar@titlelock.gov.in'}
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

            {/* Demo IDs Quick Selector */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-[#0b6b4e]" />
                  <span>Demo {roleType === 'registrar' ? 'Sub-Registrar' : 'Citizen'} Accounts (Click to Fill)</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Instant Test
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {(roleType === 'registrar' ? registrarDemoAccounts : citizenDemoAccounts).map((acc) => {
                  const isCurrent = identifier === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleApplyDemoAccount(acc)}
                      className={`w-full text-left p-2 rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-50/90 border-[#0b6b4e] text-emerald-950 shadow-xs'
                          : 'bg-white hover:bg-slate-100/80 border-slate-200/90 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-[11px] font-bold truncate flex items-center gap-1.5">
                          <span>{acc.name}</span>
                          <span className="text-[9px] font-mono font-normal text-slate-500 truncate">({acc.email})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{acc.desc}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                          isCurrent 
                            ? 'bg-[#0b6b4e] text-white' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {acc.badge}
                        </span>
                        {isCurrent && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0b6b4e]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
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
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
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
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
                  />
                </div>
              </div>
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
                    placeholder="Enter official authorization (e.g. REG-GOV-2026)"
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
                    placeholder="At least 6 chars"
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
              disabled={loading}
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
