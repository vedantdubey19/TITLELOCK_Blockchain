import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Bell, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowLeftRight,
  Filter
} from 'lucide-react';

export function CitizenNotificationsPage() {
  const { userTransfers, parcels, currentUser } = useAuth();
  const [filter, setFilter] = useState('ALL');

  // Synthesize realistic statutory notifications matching actual database parcels and petitions
  const notifications = [
    {
      id: 'NTF-01',
      title: 'Automated Cadastral Audit Reconciliation',
      message: `Sub-Registrar Noida-I confirmed automated boundary and encumbrance audit verification for active parcel records.`,
      date: '2026-10-04 14:30',
      type: 'AUDIT',
      unread: true
    },
    ...userTransfers.map((t, idx) => ({
      id: `NTF-TR-${idx + 1}`,
      title: `Conveyance Petition Status Alert: ${t.id}`,
      message: `Conveyance filing for ${t.ulpin} between ${t.seller} and ${t.buyer} is currently in stage: ${t.status}. Verification note: "${t.note || 'Clean title record'}".`,
      date: t.transactionDate,
      type: t.status === 'UNDER_REVIEW' ? 'WARNING' : 'TRANSFER',
      unread: idx === 0
    })),
    ...parcels.filter(p => p.frozen || p.encumbrances?.length > 0).map((p, idx) => ({
      id: `NTF-ENC-${idx + 1}`,
      title: `Statutory Title Alert: ${p.id}`,
      message: p.frozen 
        ? `Parcel ${p.id} has been placed under cooling-off / freeze protocol by the Registrar.`
        : `Active encumbrance recorded: ${p.encumbranceDetails}`,
      date: '2026-09-28 10:15',
      type: 'WARNING',
      unread: false
    }))
  ];

  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return n.unread;
    if (filter === 'WARNING') return n.type === 'WARNING';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Statutory Notifications & Deed Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Official alerts regarding conveyance petitions, statutory cooling-off periods, and title adjustments.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950/60 p-1 border border-slate-200 dark:border-white/10 text-xs font-semibold">
          {['ALL', 'UNREAD', 'WARNING'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === f
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 sm:p-12 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            No notifications available in this view.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`glass-panel rounded-xl p-4 border transition-colors flex items-start gap-3.5 text-xs ${
                n.unread
                  ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-500/30'
                  : 'border-slate-200/80 dark:border-white/10'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {n.type === 'WARNING' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                ) : n.type === 'TRANSFER' ? (
                  <ArrowLeftRight className="w-5 h-5 text-sky-500" />
                ) : (
                  <Bell className="w-5 h-5 text-emerald-500" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {n.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {n.date}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default CitizenNotificationsPage;
