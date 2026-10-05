import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../hooks/useAuth';

export function CitizenLayout() {
  const { toast } = useAuth();

  return (
    <div className="min-h-screen bg-mesh-subtle flex flex-col font-sans text-slate-900 dark:text-slate-100">
      <Navbar />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 backdrop-blur-xl ${
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

      {/* Main Body */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-5 sm:py-6">
        <div className="flex flex-col md:flex-row gap-5">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl py-4 text-[12px] text-slate-500 dark:text-slate-400">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">TitleLock Portal</span>
            <span>•</span>
            <span>Digital India Land Modernization Sandbox</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Version 2.4-SYNTHETIC</span>
            <span>•</span>
            <Link to="/citizen/docs" className="hover:text-sky-600 dark:hover:text-sky-400 underline transition-colors">
              Documentation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CitizenLayout;
