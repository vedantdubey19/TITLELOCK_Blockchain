import React, { useState } from 'react';
import { PropertyRecord } from '../components/PropertyRecord';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  KeyRound, 
  FileText, 
  Search, 
  X,
} from 'lucide-react';

export function CitizenPropertiesPage() {
  const { parcels, propertiesLoading, propertiesError } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalParcel, setModalParcel] = useState(null);
  const displayList = parcels;

  const filtered = displayList.filter((p) => {
    const matchesSearch = 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.currentOwner?.toLowerCase().includes(search.toLowerCase()) ||
      p.surveyNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.titleStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleIssueTokenClick = () => {
    navigate('/citizen/tokens');
  };

  const handleViewDeedClick = (parcel) => {
    setModalParcel(parcel);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Registered Properties
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse your registered titles and approve registrar sale requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/citizen/tokens')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition-colors self-start sm:self-auto cursor-pointer dark-sell-token-pill dark:text-[#f97316] dark:border-[#452a15]"
        >
          <KeyRound className="w-3.5 h-3.5 text-orange-500" />
          <span>Sale requests & keys</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-[#16181c] rounded-2xl p-4 border border-slate-100 dark:border-[#262930] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Toggle Pills */}
        <div className="flex items-center gap-2 flex-wrap">


          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#262930] bg-white dark:bg-[#121316] text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="VERIFIED_WITH_ENCUMBRANCE">ENCUMBERED</option>
            <option value="DISPUTED">DISPUTED</option>
            <option value="FROZEN">FROZEN</option>
            <option value="REVIEW">REVIEW</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ULPIN, owner, survey..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#262930] bg-white dark:bg-[#121316] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium"
          />
        </div>
      </div>

      {propertiesLoading && <p role="status">Loading your properties…</p>}
      {propertiesError && <p role="alert" className="text-red-700">{propertiesError}</p>}
      {/* Parcels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white rounded-3xl p-12 text-center text-xs text-slate-500 border border-slate-100 shadow-sm">
            {parcels.length ? 'No parcels match your search query.' : 'No registered properties are linked to your account. Existing ownership requires an identity check.'}
          </div>
        ) : (
          filtered.map((p) => {
            const isFrozen = p.frozen || p.titleStatus === 'FROZEN';

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-[#1a1c20] rounded-3xl p-5 border border-slate-100 dark:border-[#262930] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] space-y-3.5 text-xs hover:border-slate-200 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {p.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.statusVariant === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
                            : p.statusVariant === 'warning' || p.titleStatus === 'VERIFIED_WITH_ENCUMBRANCE'
                            ? 'bg-amber-50 dark:bg-[#2e2114] text-amber-700 dark:text-[#f59e0b] border border-amber-200/60 dark:border-[#523419]'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
                        }`}
                      >
                        {p.titleStatus === 'VERIFIED_WITH_ENCUMBRANCE' ? 'VERIFIED WITH ENCUMBRANCE' : p.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Survey #{p.surveyNumber} • Registered Owner: <strong className="text-slate-800 dark:text-slate-200">{p.currentOwner}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm block">
                      {p.areaSqm?.toLocaleString()} m²
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {p.registrationOffice}
                    </span>
                  </div>
                </div>

                {/* Encumbrance / Dispute badges */}
                {p.encumbranceDetails && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                    ⚠️ <strong>Active Encumbrance:</strong> {p.encumbranceDetails}
                  </div>
                )}
                {p.disputeDetails && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300">
                    🚫 <strong>Active Dispute:</strong> {p.disputeDetails}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#262930]">
                  <button
                    type="button"
                    onClick={() => handleViewDeedClick(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] font-semibold transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Record of Rights</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFrozen}
                    onClick={() => handleIssueTokenClick(p)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-600 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Open Sale Requests</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal View */}
      {modalParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1a1c20] max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-[#262930] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Record of Rights • {modalParcel.id}
              </h3>
              <button
                type="button"
                onClick={() => setModalParcel(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PropertyRecord key={modalParcel.id} ulpin={modalParcel.id} />
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenPropertiesPage;
