import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShoppingBag, FileText, CheckCircle2, Clock, Search, ArrowRight } from 'lucide-react';

export function CitizenDeedsPage() {
  const { transfers, currentUser, parcels } = useAuth();
  const [search, setSearch] = useState('');

  // Find transfers where active user is the buyer or all buyer acquisitions
  const userPurchases = transfers.filter(
    (t) => t.buyer?.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  const displayList = userPurchases.length > 0 
    ? userPurchases 
    : transfers.filter((t) => t.status === 'AWAITING_REGISTRAR' || t.note?.includes('Auto-approve')).slice(0, 10);

  const filtered = displayList.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.ulpin.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Purchases, Conveyance Deeds & Minted Titles
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Track land acquisition petitions, digital conveyance counter-signing, and immutable blockchain deeds.
          </p>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID or ULPIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Main Glassmorphic Box */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 sm:p-12 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            No purchase deeds available for this identity.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-xl p-4.5 border border-slate-200/80 dark:border-white/10 space-y-3 text-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {item.id} • {item.ulpin}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      ACQUISITION IN PROGRESS
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    Acquiring from <strong className="text-slate-900 dark:text-white">{item.seller}</strong> • Designated Buyer: <strong className="text-slate-900 dark:text-white">{item.buyer}</strong>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-500">
                  <div>Claimed Area: {item.claimedAreaSqm} m²</div>
                  <div>Filing Date: {item.transactionDate}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Cadastral RoR & Document Verification Cleared</span>
                </div>
                <span className="font-mono text-sky-600 dark:text-sky-400">
                  {item.documentHash || '0x49ca...e810'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default CitizenDeedsPage;
