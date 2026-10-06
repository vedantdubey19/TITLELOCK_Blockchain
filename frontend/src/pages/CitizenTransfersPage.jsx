import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  ShieldCheck, 
  FileText,
  UserCheck,
  Send
} from 'lucide-react';

export function CitizenTransfersPage() {
  const { userTransfers, transfers, currentUser, approveTransferPetition } = useAuth();
  
  const [filterMode, setFilterMode] = useState('USER'); // 'USER' | 'ALL'
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'FLAGGED'
  const [search, setSearch] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const baseList = filterMode === 'USER' ? userTransfers : transfers;

  const filteredTransfers = baseList.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.ulpin.toLowerCase().includes(search.toLowerCase()) ||
      t.seller.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'PENDING') return t.status === 'PENDING_APPROVAL';
    if (activeFilter === 'APPROVED') return t.status === 'AWAITING_REGISTRAR' || t.status === 'COMPLETED';
    if (activeFilter === 'FLAGGED') return t.status === 'UNDER_REVIEW';
    return true;
  });

  const handleApprove = (transferId) => {
    approveTransferPetition(transferId);
    if (selectedTransfer?.id === transferId) {
      setSelectedTransfer(prev => ({
        ...prev,
        status: 'AWAITING_REGISTRAR',
        stage: 'REGISTRAR_REVIEW'
      }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Transfer Petitions & Conveyance Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Review and digitally counter-sign conveyance petitions filed across owned and target cadastral plots ({transfers.length} database petitions).
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('USER')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'USER'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              My Petitions ({userTransfers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Petitions ({transfers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Search & Sub-filters */}
      <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'PENDING', 'APPROVED', 'FLAGGED'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === f
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Request ID, ULPIN, or Party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Main Ledger Content */}
      <div className="space-y-3">
        {filteredTransfers.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 sm:p-12 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            No transfer petitions matched your filter criteria.
          </div>
        ) : (
          filteredTransfers.map((t) => {
            const isSeller = t.seller?.toLowerCase() === currentUser?.name?.toLowerCase();
            const canSign = isSeller && t.status === 'PENDING_APPROVAL';

            return (
              <div
                key={t.id}
                className="glass-panel rounded-xl p-4.5 border border-slate-200/80 dark:border-white/10 space-y-3 text-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {t.id}
                      </span>
                      <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                        • {t.ulpin}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'AWAITING_REGISTRAR' || t.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : t.status === 'UNDER_REVIEW'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                      Conveyance from <strong className="text-slate-900 dark:text-white">{t.seller}</strong> to <strong className="text-slate-900 dark:text-white">{t.buyer}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                    <span>Claimed: {t.claimedAreaSqm} m²</span>
                    <span>Date: {t.transactionDate}</span>
                  </div>
                </div>

                {t.note && (
                  <div className={`p-2.5 rounded-lg text-[11px] ${
                    t.note.includes('Wrong') || t.note.includes('Boundary') || t.note.includes('Disputed')
                      ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                  }`}>
                    <strong>Registry Audit Note:</strong> {t.note}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5">
                  <div className="text-[10px] font-mono text-slate-400">
                    Doc Hash: {t.documentHash || '0x7f1a90c2'}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTransfer(t)}
                      className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors cursor-pointer"
                    >
                      Audit Details
                    </button>

                    {canSign && (
                      <button
                        type="button"
                        onClick={() => handleApprove(t.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sign Approval</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Petition Audit • {selectedTransfer.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 space-y-1.5 font-mono text-[11px]">
              <div>ULPIN: {selectedTransfer.ulpin}</div>
              <div>Seller: {selectedTransfer.seller}</div>
              <div>Buyer: {selectedTransfer.buyer}</div>
              <div>Claimed Area: {selectedTransfer.claimedAreaSqm} m²</div>
              <div>Date: {selectedTransfer.transactionDate}</div>
              <div>Status: {selectedTransfer.status}</div>
            </div>

            {selectedTransfer.note && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-slate-700 dark:text-slate-300">
                <strong>Verification Findings:</strong>
                <p className="mt-1 text-[11px]">{selectedTransfer.note}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
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

export default CitizenTransfersPage;
