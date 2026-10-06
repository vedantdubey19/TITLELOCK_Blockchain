import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldAlert, 
  Search, 
  ExternalLink, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Eye,
  Unlock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RegistrarRiskPage() {
  const { allParcels, showToast } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Parcels that have non-zero risk, velocity freeze, or review status
  const riskParcels = allParcels.filter(p => 
    p.frozen || 
    p.titleStatus === 'FROZEN' || 
    p.titleStatus === 'REVIEW' || 
    p.titleStatus === 'DISPUTED' || 
    p.titleStatus === 'VERIFIED_WITH_ENCUMBRANCE' ||
    p.id.includes('TARGET') ||
    p.healthScore < 85
  );

  const filtered = riskParcels.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.id.toLowerCase().includes(term) || 
           p.currentOwner?.toLowerCase().includes(term) || 
           p.surveyNumber?.toLowerCase().includes(term);
  });

  const handleToggleFreeze = (parcel) => {
    showToast(`Judicial Injunction updated for parcel ${parcel.id}`, 'info');
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header matching Reference UI */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Cadastral Risk & Fraud Assessments Register
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated risk scoring, boundary conflict checks, and historical gap inspections across all {riskParcels.length} flagged parcels.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by ULPIN, Survey Number, or Owner..."
          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0b6b4e]"
        />
      </div>

      {/* Cards List matching Reference UI Screenshot */}
      <div className="space-y-3.5">
        {filtered.map((p) => {
          const isFrozen = p.frozen || p.titleStatus === 'FROZEN';
          const isReview = p.titleStatus === 'REVIEW';
          const isDisputed = p.titleStatus === 'DISPUTED';

          return (
            <div
              key={p.id}
              className="bg-white rounded-3xl p-5 border border-slate-100/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-slate-900 text-sm">
                    {p.id}
                  </span>
                  
                  {isFrozen && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
                      FROZEN
                    </span>
                  )}
                  {isReview && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                      REVIEW
                    </span>
                  )}
                  {isDisputed && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
                      DISPUTED
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 space-x-3">
                  <span>Survey Number: <strong className="text-slate-700 font-mono">{p.surveyNumber}</strong></span>
                  <span>•</span>
                  <span>Registered Area: <strong className="text-slate-700">{p.areaSqm} m²</strong></span>
                </div>

                <div className="text-[11px] text-slate-600">
                  Primary Owner: <strong className="text-slate-800">{p.currentOwner}</strong>
                </div>
              </div>

              {/* Right Side: Health Score & Action Button */}
              <div className="flex items-center gap-4 self-end sm:self-auto flex-shrink-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Health Score</div>
                  <div className="text-base font-extrabold text-slate-900">
                    <span className={p.healthScore < 50 ? 'text-rose-600' : 'text-amber-600'}>
                      {p.healthScore}
                    </span>
                    <span className="text-slate-400 text-xs font-normal"> / 100</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/citizen/properties')}
                  className="px-4 py-2 rounded-2xl bg-[#0b6b4e] hover:bg-[#08523c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Inspect Deed ➔</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default RegistrarRiskPage;
