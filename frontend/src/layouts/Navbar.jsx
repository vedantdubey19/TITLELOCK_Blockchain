import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { 
  Search, 
  Bell, 
  RotateCcw, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function Navbar() {
  const { currentUser, globalSearch, setGlobalSearch, resetDemoState, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  // Active notifications list (from the statutory deed alerts)
  const [notifications, setNotifications] = useState([
    {
      id: 'NOTIF-01',
      title: 'Annual Cadastral Reconciliation Notice',
      message: 'Sub-Registrar Noida-I confirmed automated audit clearance and boundary reconciliation for registered parcels under your ownership.',
      date: 'Today, 11:30 AM',
      type: 'success',
      read: false
    },
    {
      id: 'NOTIF-02',
      title: 'Conveyance Petition Quorum Reminder',
      message: 'Pending transfer filings on joint parcels require counter-signature from all registered titleholders before forwarding to the Sub-Registrar.',
      date: '2026-09-28',
      type: 'warning',
      read: false
    },
    {
      id: 'NOTIF-03',
      title: 'Cryptographic Title Clearance Completed',
      message: 'Record of Rights (RoR) for parcel UP-0001-CLEAN has been successfully anchored with SHA-256 state seal.',
      date: '2026-09-24',
      type: 'info',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenLogoutConfirm = () => {
    setIsDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/citizen/login');
  };

  const handleNavigateProfile = () => {
    setIsDropdownOpen(false);
    navigate('/citizen/profile');
  };

  const handleNavigateSettings = () => {
    setIsDropdownOpen(false);
    navigate('/citizen/settings');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full flex items-center justify-between gap-4 py-3.5 px-3 sm:px-6 bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/60 dark:border-white/10 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)] transition-all">
        {/* Search Input Bar with Glassmorphic Refraction */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search parcel ID, location, or record..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/90 dark:border-white/10 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Right User Bar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Light / Dark Mode Toggle Button */}
          <ThemeToggle />

          {/* Reset / Sync button */}
          <button
            type="button"
            onClick={resetDemoState}
            title="Reset Demo State"
            className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-2 rounded-2xl bg-white/60 hover:bg-white/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/90 border border-white/80 dark:border-white/10 shadow-xs cursor-pointer backdrop-blur-md"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Notification Bell with Attached Dropdown Popover */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(prev => !prev);
                setIsDropdownOpen(false);
              }}
              title="Statutory Deed Notifications"
              className="relative text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors p-2 rounded-2xl bg-white/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-700/90 border border-white/80 dark:border-white/10 shadow-xs cursor-pointer backdrop-blur-md focus:outline-none"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Notification Box directly beneath Bell Button */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.22),0_8px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications Scrollable List */}
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-80 overflow-y-auto no-scrollbar my-1">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`py-3 px-1.5 transition-colors space-y-1.5 ${
                        !item.read ? 'bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl px-2.5 my-1' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              item.type === 'success'
                                ? 'bg-emerald-500'
                                : item.type === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-sky-500'
                            }`}
                          />
                          <span className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0">
                          {item.date}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pl-4">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Popover Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">Section 5 Cadastral Registry</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/citizen/transactions?tab=transfers');
                    }}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer"
                  >
                    View Conveyances ➔
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Identity Chip with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 sm:gap-3 p-1.5 rounded-2xl bg-white/60 hover:bg-white/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/90 border border-white/80 dark:border-white/10 shadow-xs backdrop-blur-md transition-all cursor-pointer group text-left select-none focus:outline-none"
              title="Account Menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:text-sky-700 transition-colors">
                  {currentUser?.name || 'Rajesh Kumar'}
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified Citizen • {currentUser?.id || 'USR-001'}
                </div>
              </div>

              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/90 dark:border-slate-700 shadow-xs flex items-center justify-center bg-slate-100 dark:bg-slate-800 flex-shrink-0 group-hover:border-sky-400 transition-colors">
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-700">
                    {currentUser?.name?.slice(0, 2) || 'RK'}
                  </span>
                )}
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-sky-600' : ''}`} />
            </button>

            {/* Dropdown Menu Container with High Opacity & Crisp Text */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-76 bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.22),0_8px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                {/* Header Information */}
                <div className="px-4 py-3.5 border-b border-slate-150 dark:border-white/10 mb-2 bg-slate-50/90 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                      {currentUser?.name || 'Rajesh Kumar'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/50">
                      e-KYC
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium truncate mt-0.5">
                    {currentUser?.email || 'rajesh.kumar@titlelock.gov.in'}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                    Citizen ID: <span className="font-mono text-slate-800 dark:text-slate-200">{currentUser?.id || 'USR-001'}</span>
                  </div>
                </div>

                {/* Menu Action Items */}
                <div className="space-y-1">
                  {/* Theme Mode Switcher Row */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />}
                      </div>
                      <div>
                        <div className="text-xs text-slate-900 dark:text-white font-bold">Theme Appearance</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          {theme === 'dark' ? 'Currently Dark Mode' : 'Currently Light Mode'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-bold">
                      {theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNavigateProfile}
                    className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-900 dark:text-white font-bold">View Profile & Identity</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Cryptographic credentials & deeds</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleNavigateSettings}
                    className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-900 dark:text-white font-bold">Account Settings</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Security, alerts & preferences</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/citizen/properties');
                    }}
                    className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-900 dark:text-white font-bold">Title Protection</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Section 5 registry lock status</div>
                    </div>
                  </button>
                </div>

                <div className="my-2 border-t border-slate-200/80 dark:border-white/10" />

                {/* Log Out Button */}
                <button
                  type="button"
                  onClick={handleOpenLogoutConfirm}
                  className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold transition-colors cursor-pointer text-left group"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/50 transition-colors">
                    <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  </div>
                  <span className="text-xs">Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Modal: Log Out */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-white/10 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <LogOut className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Confirm Log Out
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                Are you sure you want to end your active session on TitleLock Citizen Portal? Any unsaved edits will be preserved locally.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-5 py-2.5 rounded-2xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-5 py-2.5 rounded-2xl text-white bg-rose-600 hover:bg-rose-700 font-bold transition-colors shadow-xs cursor-pointer text-xs whitespace-nowrap"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
