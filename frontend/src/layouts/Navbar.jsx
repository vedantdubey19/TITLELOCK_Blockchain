import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { 
  Box, 
  LogOut, 
  RotateCcw, 
  Menu, 
  X,
  Sun,
  Moon,
  LayoutDashboard, 
  Building2, 
  Users2, 
  ShoppingBag, 
  ArrowLeftRight, 
  KeyRound, 
  GitFork, 
  ShieldAlert, 
  Bell, 
  UserCheck
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/citizen/dashboard', icon: LayoutDashboard },
  { label: 'My Properties', path: '/citizen/properties', icon: Building2 },
  { label: 'Associated (Nominee)', path: '/citizen/nominees', icon: Users2 },
  { label: 'Purchases & Deeds', path: '/citizen/deeds', icon: ShoppingBag },
  { label: 'Transfers & Petitions', path: '/citizen/transfers', icon: ArrowLeftRight },
  { label: 'Sell Tokens', path: '/citizen/tokens', icon: KeyRound },
  { label: 'Succession & Heirs', path: '/citizen/succession', icon: GitFork },
  { label: 'Key Recovery', path: '/citizen/recovery', icon: ShieldAlert },
  { label: 'Notifications', path: '/citizen/notifications', icon: Bell },
  { label: 'Profile & Identity', path: '/citizen/profile', icon: UserCheck },
];

export function Navbar() {
  const { currentUser, logout, resetDemoState } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/citizen/login');
  };

  return (
    <>
      {/* Top Demo Synthetic Ribbon */}
      <div className="bg-slate-100/75 dark:bg-slate-900/75 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 px-3 sm:px-5 lg:px-6 py-1.5 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between max-w-[1600px] mx-auto w-full transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-[11px] font-mono tracking-tight text-slate-700 dark:text-slate-300">
            DEMO SANDBOX • Department of Land Resources (TitleLock)
          </span>
        </div>
        <button
          onClick={resetDemoState}
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3 text-orange-500" />
          <span>Reset Session Data</span>
        </button>
      </div>

      {/* Main Professional Glass Header */}
      <header className="sticky top-0 z-40 glass-nav transition-colors">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Government Identity */}
          <Link to="/citizen/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/50 dark:border-white/10 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
              <span className="text-sky-400 font-mono font-bold">TL</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white tracking-tight text-base">
                  TitleLock
                </span>
                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  CITIZEN
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                GOVERNMENT OF INDIA • LAND RECORDS & TITLES
              </p>
            </div>
          </Link>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 3D Public Map Button */}
            <Link
              to="/citizen/map"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors"
            >
              <Box className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>3D Public Map</span>
            </Link>

            {/* LIGHT / DARK THEME TOGGLE BUTTON */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in fade-in duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in fade-in duration-200" />
              )}
            </button>

            {currentUser && (
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/10">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 flex items-center justify-center font-semibold text-xs text-slate-700 dark:text-slate-300">
                  {currentUser.name ? currentUser.name[0] : 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-none">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    ● ACTIVE
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ml-1 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#091120]/80 backdrop-blur-2xl px-4 py-3 space-y-1 shadow-xl">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}

export default Navbar;
