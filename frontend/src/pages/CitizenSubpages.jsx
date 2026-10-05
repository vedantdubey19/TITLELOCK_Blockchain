import React, { useState } from 'react';
import { ShoppingBag, ArrowLeftRight, GitFork, ShieldAlert, Bell, UserCheck, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function CitizenPlaceholderSubpage({ title, description, icon: Icon, type }) {
  const { currentUser, parcels } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 text-brand-orange" />}
          <span>{title}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10">
        {type === 'transfers' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">Recent Petitions</span>
              <span className="text-slate-500 dark:text-slate-400">Total: 2 Filings</span>
            </div>
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">PET-2026-9041 • UP-0001-CLEAN</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Conveyance to Amit Sharma (USR-BUY-001)</div>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold text-[10px]">
                  AWAITING SELLER QUORUM
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">PET-2024-1102 • UP-0002-CLEAN</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Title Registration Final Settlement</div>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold text-[10px]">
                  COMPLETED ON-CHAIN
                </span>
              </div>
            </div>
          </div>
        ) : type === 'notifications' ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-xs flex items-start gap-3">
              <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Statutory Notice: Annual Cadastral Reconciliation</div>
                <div className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                  Sub-Registrar Gautam Buddha Nagar has confirmed automated audit clearance for parcel UP-0001-CLEAN.
                </div>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs flex items-start gap-3">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">Token Expiry Notice</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Cryptographic sell token #TK-49102 has expired automatically after 48 hours without execution.
                </div>
              </div>
            </div>
          </div>
        ) : type === 'profile' ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5">
                <span className="text-slate-400">Citizen Full Name</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{currentUser?.name}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5">
                <span className="text-slate-400">Portal User Identifier</span>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{currentUser?.id}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5">
                <span className="text-slate-400">Registered Email</span>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 truncate">{currentUser?.email}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5">
                <span className="text-slate-400">Aadhaar e-KYC Verification</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aadhaar Biometric Linked</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-1">{title} Registry Ready</p>
            <p>This module is initialized with active cryptographic audit connections to TitleLock.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CitizenDeedsPage() {
  return (
    <CitizenPlaceholderSubpage
      title="Purchases & Deeds"
      description="Registered purchase agreements, registered sale deeds, and encumbrance certificates."
      icon={ShoppingBag}
      type="deeds"
    />
  );
}

export function CitizenTransfersPage() {
  return (
    <CitizenPlaceholderSubpage
      title="Transfers & Conveyance Petitions"
      description="Petitions submitted by buyers requesting transfer of cadastral title ownership."
      icon={ArrowLeftRight}
      type="transfers"
    />
  );
}

export function CitizenSuccessionPage() {
  return (
    <CitizenPlaceholderSubpage
      title="Succession & Legal Heirs"
      description="Designate legal heirs, update succession shares, and submit court testamentary certificates."
      icon={GitFork}
      type="succession"
    />
  );
}

export function CitizenRecoveryPage() {
  return (
    <CitizenPlaceholderSubpage
      title="Cryptographic Key Recovery"
      description="Social recovery guardians and threshold signature recovery protocols for lost credentials."
      icon={ShieldAlert}
      type="recovery"
    />
  );
}

export function CitizenNotificationsPage() {
  return (
    <CitizenPlaceholderSubpage
      title="Statutory Notifications & Alerts"
      description="Real-time statutory conveyance warnings, Sub-Registrar alerts, and fraud dispute notifications."
      icon={Bell}
      type="notifications"
    />
  );
}

export function CitizenProfilePage() {
  return (
    <CitizenPlaceholderSubpage
      title="Citizen Profile & Identity Verification"
      description="Aadhaar e-KYC credentials, wallet public keys, and registered biometric records."
      icon={UserCheck}
      type="profile"
    />
  );
}
