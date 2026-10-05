import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users2, 
  ShoppingBag, 
  ArrowLeftRight, 
  KeyRound, 
  GitFork, 
  ShieldAlert, 
  Bell, 
  UserCheck,
  PhoneCall
} from 'lucide-react';

const MENU_ITEMS = [
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

export function Sidebar() {
  return (
    <aside className="hidden md:block w-56 lg:w-60 flex-shrink-0">
      <div className="glass-sidebar rounded-2xl p-3.5 sticky top-20 lg:top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          Citizen Menu
        </div>

        <nav className="mt-1 space-y-0.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Assistance box */}
        <div className="mt-5 p-3.5 rounded-xl glass-panel-subtle text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-medium text-xs mb-1">
            <PhoneCall className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>Assistance & Support</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Helpline: <strong className="text-slate-900 dark:text-slate-200 font-mono">1800-111-TITLE</strong>
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
            09:30 - 18:00 IST
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
