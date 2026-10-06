import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CadastreDatabaseService } from '../services/databaseService';
import { 
  Building2, 
  KeyRound, 
  FileText, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  X,
  ExternalLink,
  Layers,
  MapPin
} from 'lucide-react';

export function CitizenPropertiesPage() {
  const { parcels, allParcels, currentUser, generateSellToken, sellTokens } = useAuth();
  const navigate = useNavigate();
  const targetBuyers = CadastreDatabaseService.getTargetBuyers();

  const [filterMode, setFilterMode] = useState('MINE'); // 'MINE' | 'ALL'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalParcel, setModalParcel] = useState(null);
  const [actionType, setActionType] = useState('token'); // 'token' | 'deed'
  const [selectedBuyer, setSelectedBuyer] = useState(targetBuyers[0]?.id || 'USR-BUY-001');
  const [issuedToken, setIssuedToken] = useState(null);

  const displayList = filterMode === 'MINE' ? parcels : allParcels;

  const filtered = displayList.filter((p) => {
    const matchesSearch = 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.currentOwner?.toLowerCase().includes(search.toLowerCase()) ||
      p.surveyNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.titleStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleIssueTokenClick = (parcel) => {
    setModalParcel(parcel);
    setActionType('token');
    setIssuedToken(null);
  };

  const handleViewDeedClick = (parcel) => {
    setModalParcel(parcel);
    setActionType('deed');
  };

  const confirmGenerateToken = () => {
    const b = targetBuyers.find(x => x.id === selectedBuyer) || targetBuyers[0];
    const tok = generateSellToken(modalParcel.id, b.id, b.name);
    setIssuedToken(tok);
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
            Browse owned titles, Record of Rights (RoR), and generate cryptographic Sell Tokens.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/citizen/transactions?tab=tokens')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-orange-500" />
          <span>Active Sell Tokens ({sellTokens.length})</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Toggle Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/60 font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('MINE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'MINE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              My Parcels ({parcels.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Registry ({allParcels.length})
            </button>
          </div>

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

      {/* Parcels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white rounded-3xl p-12 text-center text-xs text-slate-500 border border-slate-100 shadow-sm">
            No parcels match your search query.
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
                    <span>Issue Sell Token</span>
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
                {actionType === 'token'
                  ? `Generate Sell Token • ${modalParcel.id}`
                  : `Record of Rights • ${modalParcel.id}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalParcel(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionType === 'token' ? (
              !issuedToken ? (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600">
                    Authorize a prospective buyer to submit a transfer petition for parcel <strong>{modalParcel.id}</strong>.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Target Buyer
                    </label>
                    <select
                      value={selectedBuyer}
                      onChange={(e) => setSelectedBuyer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-sky-500 font-medium"
                    >
                      {targetBuyers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={confirmGenerateToken}
                    className="w-full py-2.5 rounded-xl font-bold text-white bg-[#2563eb] hover:bg-blue-700 shadow-xs cursor-pointer"
                  >
                    Generate HMAC-SHA256 Token
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Sell Token Generated Successfully</span>
                    </div>
                    <div className="font-mono text-xs break-all bg-white p-2.5 rounded-xl border border-emerald-200 text-slate-900 font-semibold">
                      {issuedToken.tokenId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalParcel(null)}
                    className="w-full py-2 rounded-xl font-semibold bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 font-sans block">Current Owner:</span>
                    <span className="text-slate-900 font-bold">{modalParcel.currentOwner}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block">Registered Area:</span>
                    <span className="text-slate-900 font-bold">{modalParcel.areaSqm} m²</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block">Survey Number:</span>
                    <span className="text-slate-900 font-bold">{modalParcel.surveyNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block">Sub-Registrar:</span>
                    <span className="text-slate-900 font-bold">{modalParcel.registrationOffice}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Conveyance Chain ({modalParcel.transferHistory?.length || 0})
                  </span>
                  <div className="space-y-1">
                    {(modalParcel.transferHistory || []).map((h, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between text-slate-900 font-medium">
                          <span>{h.from} ➔ {h.to}</span>
                          <span className="font-mono text-[10px] text-slate-400">{h.date}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">Doc Hash: {h.doc_hash}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenPropertiesPage;
