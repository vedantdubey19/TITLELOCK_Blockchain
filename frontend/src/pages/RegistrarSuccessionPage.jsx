import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Users2, 
  Search, 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function RegistrarSuccessionPage() {
  const { allParcels, showToast } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Extract succession cases from parcels
  const successionList = allParcels
    .filter(p => (p.nominees && p.nominees.length > 0) || p.titleStatus === 'SUCCESSION_PENDING')
    .slice(0, 10);

  const filtered = successionList.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.id.toLowerCase().includes(term) ||
           p.currentOwner?.toLowerCase().includes(term) ||
           p.nomineeName?.toLowerCase().includes(term);
  });

  const handleProbateApprove = (parcelId, nominee) => {
    showToast(`Probate succession certificate issued for ${nominee} on ${parcelId}`, 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Statutory Succession & Nominee Desk
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review legal heir succession filings, Section 5 nominee endorsements, and title mutation proceedings.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by ULPIN, Owner, or Nominee name..."
          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
        />
      </div>

      {/* Succession Records Grid */}
      <div className="space-y-3.5">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">{p.id}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800">
                  NOMINEE REGISTERED
                </span>
              </div>

              <div className="text-[11px] text-slate-500">
                Current Titleholder: <strong className="text-slate-800">{p.currentOwner}</strong>
              </div>

              <div className="text-[11px] text-slate-700 flex items-center gap-2">
                <Users2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Primary Nominee: <strong className="text-slate-900">{p.nomineeName || 'Designated Legal Heir'}</strong> ({p.nomineeRelation || 'Successor'})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => handleProbateApprove(p.id, p.nomineeName || 'Heir')}
                className="px-4 py-2 rounded-2xl bg-[#0b6b4e] hover:bg-[#08523c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Endorse Succession</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default RegistrarSuccessionPage;
