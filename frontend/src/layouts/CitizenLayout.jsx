import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../hooks/useAuth';

export function CitizenLayout() {
  const { currentUser, toast } = useAuth();

  // If user is logged in as a Registrar, redirect them to the Registrar Portal
  if (currentUser && (currentUser.role === 'REGISTRAR' || currentUser.activeRole === 'REGISTRAR')) {
    return <Navigate to="/registrar/dashboard" replace />;
  }

  // If no user is logged in, redirect to citizen login
  if (!currentUser) {
    return <Navigate to="/citizen/login" replace />;
  }

  return (
    <div className="h-screen w-full bg-[#f8fafc] bg-mesh-subtle flex flex-col md:flex-row font-sans text-slate-900 antialiased selection:bg-sky-500/20 overflow-hidden">
      {/* Pinned Glassmorphic Left Sidebar */}
      <Sidebar />

      {/* Main Content Area with Fixed Top Navbar & Scrollable Body */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Pinned Top Glass Navbar */}
        <Navbar />

        {/* Scrollable Dynamic Page Content */}
        <main className="flex-1 px-4 sm:px-8 py-5 pb-16 max-w-[1500px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

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

export default CitizenLayout;
