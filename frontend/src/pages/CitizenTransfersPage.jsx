import React, { useState } from 'react';

export function CitizenTransfersPage() {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const filterTabs = ['ALL', 'ACTIVE', 'COMPLETED', 'REJECTED'];

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Transfer Petitions & Conveyance Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Review all conveyance petitions filed across owned, associated, and purchased cadastral parcels.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950/60 p-1 border border-slate-200 dark:border-white/10 text-xs font-semibold self-start sm:self-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeFilter === tab
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Content */}
      <div className="glass-panel rounded-2xl p-8 sm:p-12 text-center">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          No server transfers found.
        </p>
      </div>

    </div>
  );
}

export default CitizenTransfersPage;
