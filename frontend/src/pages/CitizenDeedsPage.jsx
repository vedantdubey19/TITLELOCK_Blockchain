import React from 'react';

export function CitizenDeedsPage() {
  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Purchases, Conveyance Deeds & Minted Titles
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Track land acquisition petitions, digital conveyance counter-signing, and immutable blockchain deeds.
        </p>
      </div>

      {/* Main Glassmorphic Box */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-2">
          All Purchase Petitions
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          No purchase petitions are available for this identity.
        </p>
      </div>

    </div>
  );
}

export default CitizenDeedsPage;
