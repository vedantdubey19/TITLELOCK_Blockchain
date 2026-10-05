import React, { useState } from 'react';
import { NOMINEE_PROPERTIES } from '../constants/mockData';
import { Info, Lock, X, ArrowRight } from 'lucide-react';

export function CitizenNomineesPage() {
  const [properties, setProperties] = useState(NOMINEE_PROPERTIES);
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="space-y-5">
      
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Associated Properties & Statutory Nominee Rights
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Properties where your identity is endorsed on the Record of Rights as a designated nominee under Indian Succession Act.
        </p>
      </div>

      {/* 2. STATUTORY NOMINEE NOTICE (SCN-03): DORMANT RIGHTS */}
      <div className="rounded-xl p-4 bg-sky-500/10 border border-sky-500/20 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
            STATUTORY NOMINEE NOTICE (SCN-03): DORMANT RIGHTS
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Nominee endorsement does not grant immediate title ownership while the primary titleholder is living. Your status is <strong className="text-slate-900 dark:text-slate-200">DORMANT</strong>. You receive immutable statutory alerts upon any conveyance or encumbrance filings, but you cannot generate Sell Keys or execute transfers until legal heir succession proceedings are initiated.
          </p>
        </div>
      </div>

      {/* 3. Nominee Property Card */}
      <div className="space-y-3">
        {properties.map((item) => (
          <div
            key={item.id}
            className="glass-panel rounded-xl p-4 sm:p-5 text-xs border border-slate-200/80 dark:border-white/10"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200/60 dark:border-white/5 gap-2.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </span>
                  
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    • {item.status}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                    {item.tag}
                  </span>
                </div>

                <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
                  Survey No: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.surveyNumber}</strong> • Area: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.areaSqm.toLocaleString()} m²</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors self-start sm:self-auto flex items-center gap-1 cursor-pointer"
              >
                <span>Cadastral Record</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Middle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Designated Nominee:</span>
                <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                  {item.designatedNominee}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Relation: {item.relation}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Endorsed Share:</span>
                <div className="font-mono font-bold text-sky-700 dark:text-sky-400 mt-0.5">
                  {item.endorsedShare}
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Status:</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-amber-700 dark:text-amber-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{item.statusNote}</span>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="text-slate-600 dark:text-slate-400">
                Primary Owner: <strong className="text-slate-900 dark:text-slate-200">{item.primaryOwner}</strong>
              </div>

              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 cursor-not-allowed flex items-center justify-center gap-1.5 self-start sm:self-auto"
                title="Nominee cannot issue sell keys while primary owner is alive."
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Issue Sell Key (Blocked)</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cadastral Record Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Cadastral Endorsement Sheet
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-200 dark:border-white/5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ULPIN ID:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">{selectedItem.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Survey No:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">{selectedItem.surveyNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Title Status:</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{selectedItem.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Nominee Registered:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedItem.designatedNominee} ({selectedItem.relation})</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                <strong>Statutory Note:</strong> Upon verified succession initiation, the nominee may petition the Sub-Registrar to unlock transfer authority.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenNomineesPage;
