import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Wallet, CheckCircle, Copy, Check } from 'lucide-react';

export function CitizenProfilePage() {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const sovereignWallet = "0x742d35Cc6634C0532925a3b8448c454e4438f44c";

  const permissions = [
    { key: "CAN_VIEW_OWNED_TITLES", label: "CAN_VIEW_OWNED_TITLES" },
    { key: "CAN_ISSUE_SELL_TOKENS", label: "CAN_ISSUE_SELL_TOKENS" },
    { key: "CAN_APPROVE_TRANSFERS", label: "CAN_APPROVE_TRANSFERS" },
    { key: "CAN_RECEIVE_DEED_NOTICES", label: "CAN_RECEIVE_DEED_NOTICES" },
  ];

  const handleCopy = () => {
    navigator.clipboard?.writeText(sovereignWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Citizen Identity & Credential Console
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Authenticated identity, permissions, and credential status from the registry session.
        </p>
      </div>

      {/* 2. Main Profile Card */}
      <div className="glass-panel rounded-xl p-5 sm:p-6 space-y-5 text-xs">
        
        {/* User Identity Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-800 dark:text-white font-mono font-bold text-sm">
            CZ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                VERIFIED
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
              Independent Citizen Landholder
            </div>
          </div>
        </div>

        {/* 3-Cell Credential Meta Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-lg text-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Unique Citizen ID:</span>
            <div className="font-mono text-slate-900 dark:text-white mt-0.5">
              {currentUser?.id || 'USR-001'}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Official Email:</span>
            <div className="font-mono text-slate-900 dark:text-white mt-0.5 truncate">
              {currentUser?.email || 'rajesh@demo.local'}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Account Status:</span>
            <div className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
              ACTIVE
            </div>
          </div>
        </div>

        {/* Assigned Roles */}
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 font-medium">
            Assigned Portal Roles:
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            OWNER
          </span>
        </div>

        {/* Cryptographic Title Wallet */}
        <div className="p-4 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-medium">
            <Wallet className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <span>Cryptographic Title Wallet (Ethereum Sovereign Identity)</span>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 shadow-xs">
            <span className="font-mono text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 break-all select-all">
              {sovereignWallet}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hardware-backed sovereign key for signing statutory deed petitions and minting on-chain title receipts.
          </p>
        </div>

        {/* Statutory Permissions */}
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-medium">
            Statutory Permissions:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {permissions.map((perm) => (
              <div
                key={perm.key}
                className="p-2.5 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center gap-2 font-mono text-[11px] text-slate-800 dark:text-slate-300"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                <span>{perm.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

export default CitizenProfilePage;
