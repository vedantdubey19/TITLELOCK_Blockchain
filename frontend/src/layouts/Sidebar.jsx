import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  FolderSync, 
  Map, 
  Headphones, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Sidebar() {
  const { userTransfers } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/citizen/dashboard', icon: Home },
    { label: 'My Properties', path: '/citizen/properties', icon: FileText },
    { 
      label: 'Transactions', 
      path: '/citizen/transactions', 
      icon: FolderSync,
      badge: userTransfers.length > 0 ? userTransfers.length : null
    },
    { label: 'Parcel Explorer', path: '/citizen/map', icon: Map },
  ];

  return (
    <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 z-30 flex-shrink-0 flex flex-col justify-between py-6 px-4 bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border-r border-white/60 dark:border-white/10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3)] md:overflow-y-auto no-scrollbar transition-all">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-[0_2px_10px_-2px_rgba(14,165,233,0.15)] flex items-center justify-center p-2">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full text-sky-500">
              <path d="M16 4L4 10L16 16L28 10L16 4Z" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16L16 22L28 16" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 22L16 28L28 22" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
              <span>TitleLock</span>
            </div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-1 block">
              Citizen Portal
            </span>
          </div>
        </div>

        {/* Section Title */}
        <div className="px-3 mb-2.5">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase font-sans">
            Land Records & Titles
          </span>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white shadow-[0_4px_16px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)] border border-white/90 dark:border-white/10 backdrop-blur-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      {/* Active Left Pill Indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#f97316]" />
                      )}
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-slate-800 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200/50 dark:border-white/10">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Citizen Support Card at bottom */}
      <div className="mt-8 space-y-4">
        <div className="rounded-3xl p-4 bg-gradient-to-br from-sky-50/70 via-blue-50/40 to-indigo-50/50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-sky-950/40 backdrop-blur-lg border border-sky-100/70 dark:border-white/10 shadow-[0_4px_16px_-4px_rgba(14,165,233,0.06)] space-y-3">
          <div className="w-8 h-8 rounded-xl bg-white/90 dark:bg-slate-700 shadow-xs flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Citizen Support
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
              Land records assistance
            </div>
          </div>
          <a
            href="tel:1800111848"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
          >
            <span>Contact support</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-400 dark:text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Citizen-first. Always.</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
