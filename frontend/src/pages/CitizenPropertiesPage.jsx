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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-orange-500" />
          <span>Sale requests & keys</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Toggle Pills */}
        <div className="flex items-center gap-2 flex-wrap">

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium focus:outline-none"
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ULPIN, owner, survey..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-medium"
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
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] space-y-3.5 text-xs hover:border-slate-200 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {p.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.statusVariant === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : p.statusVariant === 'warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      Survey #{p.surveyNumber} • Registered Owner: <strong className="text-slate-800">{p.currentOwner}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm block">
                      {p.areaSqm?.toLocaleString()} m²
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {p.registrationOffice}
                    </span>
                  </div>
                </div>

                {/* Encumbrance / Dispute badges */}
                {p.encumbranceDetails && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-[11px] text-amber-800">
                    ⚠️ <strong>Active Encumbrance:</strong> {p.encumbranceDetails}
                  </div>
                )}
                {p.disputeDetails && (
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-[11px] text-rose-800">
                    🚫 <strong>Active Dispute:</strong> {p.disputeDetails}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleViewDeedClick(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Record of Rights</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFrozen}
                    onClick={() => handleIssueTokenClick(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Record of Rights • {modalParcel.id}
              </h3>
              <button
                type="button"
                onClick={() => setModalParcel(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
