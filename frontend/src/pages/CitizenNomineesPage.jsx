import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { NOMINEE_PROPERTIES } from '../constants/mockData';
import { Info, Lock, X, ArrowRight, Search, ShieldCheck } from 'lucide-react';

export function CitizenNomineesPage() {
  const { allParcels, nomineeProperties, currentUser } = useAuth();
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');

  // Extract all parcels that have nominees
  const allNomineeParcels = allParcels.filter(p => p.nominees && p.nominees.length > 0);

  // If active user is named as a nominee, prioritize those; else show all database nominee endorsements
  const displayList = nomineeProperties.length > 0 ? nomineeProperties : allNomineeParcels.map(p => {
    const nom = p.nominees[0];
    return {
      id: p.ulpin,
      title: p.ulpin,
      status: p.status,
      tag: "Nominee Endorsed",
      surveyNumber: p.surveyNumber,
      areaSqm: p.areaSqm,
      designatedNominee: nom.name,
      relation: nom.relationship,
      endorsedShare: nom.share_percent ? `${nom.share_percent}%` : "100%",
      statusNote: nom.status ? `${nom.status} (Owner Active)` : "DORMANT (Owner Active)",
      primaryOwner: p.currentOwner,
      nominees: p.nominees
    };
  });

  const filtered = displayList.filter(
    (item) =>
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.designatedNominee.toLowerCase().includes(search.toLowerCase()) ||
      item.primaryOwner?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Associated Properties & Statutory Nominee Rights
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Properties where identities are endorsed on the Record of Rights as designated nominees under the Indian Succession Act.
          </p>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Nominee or ULPIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
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

      {/* 3. Nominee Property Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel rounded-xl p-8 text-center text-xs text-slate-500">
            No nominee records matched your search.
          </div>
        ) : (
          filtered.map((item) => (
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

                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      {item.tag || 'Nominee Endorsed'}
                    </span>
                  </div>

                  <div className="text-slate-500 dark:text-slate-400 mt-1 text-[11px]">
                    Survey No: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.surveyNumber}</strong> • Area: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.areaSqm?.toLocaleString()} m²</strong> • Registered Owner: <strong className="text-slate-900 dark:text-white">{item.primaryOwner}</strong>
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
                    Relationship: {item.relation}
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
            </div>
          ))
        )}
      </div>

      {/* Record Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Nominee Statutory Certificate • {selectedItem.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl space-y-1 font-mono text-[11px]">
              <div>ULPIN: {selectedItem.id}</div>
              <div>Survey: {selectedItem.surveyNumber}</div>
              <div>Primary Titleholder: {selectedItem.primaryOwner}</div>
              <div>Nominee: {selectedItem.designatedNominee} ({selectedItem.relation})</div>
              <div>Status: {selectedItem.statusNote}</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
              <Lock className="w-3.5 h-3.5 inline mr-1" />
              Sell Token and Transfer controls are disabled for nominees while the primary owner is active.
            </div>

            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenNomineesPage;
