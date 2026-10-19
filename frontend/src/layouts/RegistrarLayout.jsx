import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { 
  Building2, 
  LayoutDashboard, 
  FileCheck2, 
  Users2, 
  ShieldAlert, 
  FileClock, 
  UserCheck, 
  Compass, 
  LogOut, 
  RotateCcw,
  Scale,
  Award,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Search,
  Bell,
  X,
  Sun,
  Moon
} from 'lucide-react';

export function RegistrarLayout() {
  const { currentUser, authLoading, logout, resetDemoState, toast } = useAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Dashboard', path: '/registrar/dashboard', icon: LayoutDashboard },
    { label: 'Transfer Petitions', path: '/registrar/petitions', icon: FileCheck2 },
    { label: 'Succession Desk', path: '/registrar/succession', icon: Users2 },
    { label: 'Risk Reviews', path: '/registrar/risk', icon: ShieldAlert },
    { label: 'Sale Activity', path: '/registrar/audit', icon: FileClock },
    { label: 'Officer Credentials', path: '/registrar/credentials', icon: UserCheck }
  ];

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    if (await logout()) navigate('/registrar/login');
  };

  // If not logged in, redirect to login
  if (authLoading) return <div role="status" className="p-8 text-center">Checking your session…</div>;
  if (!currentUser) {
    return <Navigate to="/registrar/login" replace />;
  }

  // If logged in as Citizen, deny access and redirect to citizen dashboard
  if (currentUser.role !== 'REGISTRAR' && currentUser.activeRole !== 'REGISTRAR') {
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] dark:bg-[#080f1d] bg-mesh-subtle flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/20 overflow-hidden">
      
      {/* Pinned Glassmorphic Left Sidebar (Matching Citizen Portal Style) */}
      <aside className="max-h-48 overflow-y-auto md:max-h-none w-full md:w-64 md:h-screen md:sticky md:top-0 z-30 flex-shrink-0 flex flex-col justify-between py-6 px-4 bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border-r border-white/60 dark:border-white/10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)] md:overflow-y-auto no-scrollbar transition-all">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-[0_2px_10px_-2px_rgba(11,107,78,0.18)] flex items-center justify-center p-2">
              <Building2 className="w-5 h-5 text-[#0b6b4e] dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
                <span>TitleLock</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider text-[#0b6b4e] dark:text-emerald-400 uppercase mt-1 block">
                Sub-Registrar
              </span>
            </div>
          </div>

          {/* Section Title */}
          <div className="px-3 mb-2.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase font-sans">
              Statutory Adjudication
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white/90 text-slate-900 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.06)] border border-white/90 backdrop-blur-md'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#0b6b4e]" />
                        )}
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#0b6b4e]' : 'text-slate-400 group-hover:text-slate-700'}`} />
                        <span>{item.label}</span>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Statutory Authority Info Card at bottom of Sidebar */}
        <div className="mt-8 space-y-4">
          <div className="rounded-3xl p-4 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50/60 backdrop-blur-lg border border-emerald-100/70 shadow-[0_4px_16px_-4px_rgba(11,107,78,0.08)] space-y-3">
            <div className="w-8 h-8 rounded-xl bg-white/90 shadow-xs flex items-center justify-center text-[#0b6b4e]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Statutory Authority
              </div>
              <div className="text-xs text-slate-700 mt-0.5 font-medium">
                Registration Act 1908
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Cryptographically signed deeds adhere to Section 5 state cadastre protocol.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Government Portal</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Fixed Top Navbar & Scrollable Body */}
      <div className="flex-1 min-h-0 min-w-0 h-full flex flex-col overflow-y-auto overflow-x-hidden">
        
        {/* Pinned Top Glass Navbar (Matching Citizen Navbar Style & Theme) */}
        <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/60 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          
          {/* Left Info / State Tag */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tehsil Dadri / Noida-I Office</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                ONLINE
              </span>
            </div>

            {/* Quick 3D Map Button */}
            <button
              type="button"
              onClick={() => navigate('/citizen/map')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden md:inline">3D Cadastral Map</span>
            </button>
          </div>

          {/* Right Actions & Officer Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Theme Appearance Mode Toggle */}
            <ThemeToggle />

            {/* Reset Demo State button */}
            <button
              type="button"
              onClick={resetDemoState}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              title="Reset sample registry data to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Reset State</span>
            </button>

          <button type="button" onClick={() => navigate('/registrar/notifications')} title="Sale notifications" className="p-2 rounded-xl border bg-white dark:bg-slate-800">
            <Bell className="w-4 h-4" />
          </button>

            {/* Officer Profile Dropdown Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/80 dark:border-white/10 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:bg-white dark:hover:bg-slate-700/80 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-[#0b6b4e] dark:text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50 flex-shrink-0">
                  SR
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {currentUser?.name || 'Sub-Registrar'}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                    {currentUser?.jurisdiction?.split('/')[0] || 'Sub-Registrar Officer'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-0.5" />
              </button>

              {/* Profile Menu Popup */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-slate-100 dark:border-white/10 mb-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{currentUser?.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{currentUser?.email}</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                      <ShieldCheck className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                      <span>OFFICIAL SUB-REGISTRAR</span>
                    </div>
                  </div>

                  <NavLink
                    to="/registrar/credentials"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>Officer Credentials</span>
                  </NavLink>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Scrollable Dynamic Page Content (Matching Citizen Page Frame) */}
        <main className="flex-1 px-4 sm:px-8 py-6 pb-16 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-base">Sign Out of Registrar Gateway?</h3>
              <p className="text-xs text-slate-500 mt-1">
                You will need official credentials to re-access the statutory conveyance adjudication desk.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-500/10'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40 shadow-amber-500/10'
                : 'bg-slate-900/90 text-sky-200 border-sky-500/40 shadow-sky-500/10'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}

export default RegistrarLayout;
