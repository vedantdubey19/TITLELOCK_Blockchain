import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DEMO_USERS } from '../constants/mockData';
import { Shield, Mail, User, Key, Eye, EyeOff, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export function CitizenLoginPage() {
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('signin');
  const [authMethod, setAuthMethod] = useState('email');

  const [identifier, setIdentifier] = useState('rajesh@demo.local');
  const [password, setPassword] = useState('Demo@001');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const res = login(identifier, password);
      setLoading(false);
      if (res.success) {
        navigate('/citizen/dashboard');
      } else {
        setError(res.message);
      }
    }, 300);
  };

  const handleUseFixture = (fixture) => {
    setIdentifier(fixture.email);
    setPassword(fixture.password);
    loginAsDemo(fixture);
    navigate('/citizen/dashboard');
  };

  return (
    <div className="min-h-screen bg-mesh-subtle flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Institutional Top Indicator */}
      <div className="w-full max-w-md mx-auto mb-5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-mono shadow-xs backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <span>TitleLock Cadastre Ledger • Section 5 Node</span>
        </div>
      </div>

      {/* Main Professional Glass Card */}
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-7 shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 mx-auto flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3 shadow-xs">
            <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Department of Land Records
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Government of India • Citizen Titleholder Portal
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl mb-5 border border-slate-200 dark:border-white/5">
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'signin'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Register (Sign Up)
          </button>
        </div>

        {tab === 'signin' ? (
          <div>
            {/* Auth Method Selector */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Authentication Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('username')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    authMethod === 'username'
                      ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Username</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('digilocker');
                    setIdentifier('digi-verified-8890');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    authMethod === 'digilocker'
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>DigiLocker</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {authMethod === 'email'
                    ? 'Registered Email Address'
                    : authMethod === 'username'
                    ? 'Citizen Username / Portal ID'
                    : 'DigiLocker Linked Identifier'}
                </label>
                <input
                  type={authMethod === 'email' ? 'email' : 'text'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={authMethod === 'email' ? 'rajesh@demo.local' : 'rajesh_kumar'}
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-colors shadow-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Demo: Demo@001
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-colors pr-9 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-xs sm:text-sm text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Citizen Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-800 dark:text-sky-200 leading-relaxed font-normal">
              Citizen credentials are linked to state cadastre records via Aadhaar / DigiLocker e-KYC.
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Aadhaar / National ID (12-Digit)
              </label>
              <input
                type="text"
                placeholder="XXXX-XXXX-9021"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors shadow-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Land Parcel ULPIN
              </label>
              <input
                type="text"
                placeholder="UP-0001-CLEAN"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors shadow-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => handleUseFixture(DEMO_USERS[0])}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Verify & Auto-Provision Account</span>
            </button>
          </div>
        )}

        {/* Demo Directory Test Fixtures */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between text-xs mb-2.5">
            <span className="text-slate-600 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              Demo Directory Fixtures
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Auto-fill</span>
          </div>

          <div className="space-y-2">
            {DEMO_USERS.map((usr) => (
              <div
                key={usr.id}
                className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors flex items-center justify-between"
              >
                <div className="text-left pr-2 text-xs">
                  <div className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {usr.email}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {usr.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUseFixture(usr)}
                  className="px-2.5 py-1 rounded text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-100 hover:bg-sky-200 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 border border-sky-300 dark:border-sky-500/20 transition-colors cursor-pointer"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 text-center text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
        Protected with 256-bit cryptographic land ledger attestations.
      </div>
    </div>
  );
}

export default CitizenLoginPage;
