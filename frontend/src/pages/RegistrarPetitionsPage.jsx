import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FileCheck2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Stamp
} from 'lucide-react';

export function RegistrarPetitionsPage() {
  const { transfers, approveTransferPetition, showToast } = useAuth();

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'HIGH RISK' | 'COMMITTED' | 'REJECTED'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPetition, setSelectedPetition] = useState(null);

  // Filter petitions matching filters in Reference UI
  const filteredPetitions = transfers.filter((t) => {
    // Filter type
    if (filter === 'PENDING' && !(t.status === 'AWAITING_REGISTRAR' || t.status === 'PENDING_APPROVAL')) return false;
    if (filter === 'HIGH RISK' && !(t.note?.includes('Wrong seller') || t.note?.includes('Disputed') || t.note?.includes('Backdated'))) return false;
    if (filter === 'COMMITTED' && t.status !== 'COMPLETED') return false;
    if (filter === 'REJECTED' && t.status !== 'REJECTED') return false;

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchId = t.id?.toLowerCase().includes(term);
      const matchUlpin = t.ulpin?.toLowerCase().includes(term);
      const matchSeller = t.seller?.toLowerCase().includes(term);
      const matchBuyer = t.buyer?.toLowerCase().includes(term);
      if (!matchId && !matchUlpin && !matchSeller && !matchBuyer) return false;
    }
    return true;
  });

  const handleApprove = (id) => {
    approveTransferPetition(id);
    showToast(`Conveyance Petition ${id} adjudicated and sealed on state ledger!`, 'success');
  };

  const handleReject = (id) => {
    showToast(`Conveyance Petition ${id} rejected due to statutory defect`, 'warning');
  };

  const filterTabs = ['ALL', 'PENDING', 'HIGH RISK', 'COMMITTED', 'REJECTED'];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sub-Registrar Transfer Petitions Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Statutory conveyance petitions awaiting registrar review, risk adjudication, and cryptographic seal.
          </p>
        </div>

        {/* Start Petition / Filter Button */}
        <button
          type="button"
          onClick={() => showToast('Opening deed intake registry...', 'info')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0b6b4e] hover:bg-[#08523c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Start Petition</span>
        </button>
      </div>

      {/* Filter Tabs Bar matching reference UI */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/80 shadow-xs">
          {filterTabs.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === f
                  ? 'bg-[#0b6b4e] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter petitions by ID, ULPIN, party..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
          />
        </div>
      </div>

      {/* Main Table Card matching reference UI columns:
          REQUEST ID | CADASTRAL TARGET | PARTIES | VALUE | STATUS | RISK LEVEL | ADJUDICATION ACTIONS */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Cadastral Target</th>
                <th className="py-3 px-4">Parties</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Adjudication Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPetitions.length > 0 ? (
                filteredPetitions.map((p) => {
                  const isHighRisk = p.note?.includes('Wrong seller') || p.note?.includes('Disputed') || p.note?.includes('Backdated');
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {p.ulpin}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.claimedAreaSqm} m²
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.seller}</div>
                        <div className="text-slate-400 text-[10px] flex items-center gap-1">
                          <span>➔</span>
                          <span>{p.buyer}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        ₹{(p.claimedAreaSqm * 4200).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'AWAITING_REGISTRAR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isHighRisk ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            HIGH RISK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 w-max block">
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApprove(p.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <Stamp className="w-3 h-3" />
                            <span>Seal & Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(p.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No transfer petitions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default RegistrarPetitionsPage;
