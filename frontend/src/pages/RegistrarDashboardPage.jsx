import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  ArrowRight, 
  ArrowUpRight, 
  FileText, 
  ShieldAlert, 
  Users2, 
  Lock, 
  Compass, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Scale
} from 'lucide-react';

export function RegistrarDashboardPage() {
  const { allParcels, transfers, approveTransferPetition, showToast } = useAuth();
  const navigate = useNavigate();

  // Metrics matching reference UI screenshot:
  // Cadastral Parcels, Pending Transfers, High Risk Flagged, Succession Cases, Frozen Parcels
  const totalParcels = allParcels.length;
  const pendingTransfers = transfers.filter(t => t.status === 'AWAITING_REGISTRAR' || t.status === 'PENDING_APPROVAL');
  const highRiskParcels = allParcels.filter(p => p.riskStatus === 'HIGH' || p.titleStatus === 'DISPUTED' || p.titleStatus === 'REVIEW');
  const successionCases = allParcels.filter(p => (p.nominees && p.nominees.length > 0) || p.titleStatus === 'SUCCESSION_PENDING');
  const frozenParcels = allParcels.filter(p => p.frozen || p.titleStatus === 'FROZEN');

  // Priority Adjudication Queue
  const priorityQueue = pendingTransfers.slice(0, 5);

  const stats = [
    { label: 'Cadastral Parcels', value: totalParcels, sub: 'Total RoR Directory', icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Pending Transfers', value: pendingTransfers.length, sub: 'Awaiting adjudication', icon: FileCheck2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'High Risk Flagged', value: highRiskParcels.length, sub: 'Requires manual override', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Succession Cases', value: successionCases.length, sub: 'Legal heir proceedings', icon: Users2, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Frozen Parcels', value: frozenParcels.length, sub: 'Court injunction orders', icon: Lock, color: 'text-slate-800', bg: 'bg-slate-100' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sub-Registrar Adjudication Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            District Registry Office Gautam Buddha Nagar • Official Cadastral & Conveyance Authority
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/registrar/petitions')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0b6b4e] hover:bg-[#08523c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <span>Open Adjudication Queue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5 Stats Cards Grid matching reference UI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div 
              key={idx}
              className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 truncate">{s.label}</span>
                <div className={`w-7 h-7 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
                  {s.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Adjudication Queue Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Clock className="w-4 h-4 text-[#0b6b4e]" />
            <span>Priority Adjudication Queue (Exact Priority Order)</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/registrar/petitions')}
            className="text-[11px] font-bold text-[#0b6b4e] hover:underline cursor-pointer"
          >
            Full Queue ({pendingTransfers.length}) ➔
          </button>
        </div>

        {priorityQueue.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {priorityQueue.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 rounded-2xl px-2 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">{item.id}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {item.ulpin}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                      AWAITING REVIEW
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-800">{item.seller}</span>
                    <span className="text-slate-400 mx-1.5">➔</span>
                    <span className="font-semibold text-slate-800">{item.buyer}</span>
                    <span className="text-slate-400 ml-2">({item.claimedAreaSqm} m²)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      approveTransferPetition(item.id);
                      showToast(`Petition ${item.id} approved by Sub-Registrar`, 'success');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                  >
                    Seal & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/registrar/petitions')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    Review Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No transfer petitions pending registrar adjudication at this time.
          </div>
        )}
      </div>

      {/* Two Column Bottom Grid: Jurisdictional 3D Cadastral Map + Statutory Registrar Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Jurisdictional 3D Cadastral Map Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] space-y-4 text-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Compass className="w-4 h-4 text-sky-600" />
              <span>Jurisdictional 3D Cadastral Map</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Directly inspect extruded 3D parcel polygons, survey coordinates, and SAT boundary overlap collisions across Noida & Greater Noida sectors.
            </p>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => navigate('/citizen/map')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <span>Launch Full 3D Map View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Statutory Registrar Controls Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] space-y-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Scale className="w-4 h-4 text-[#0b6b4e]" />
            <span>Statutory Registrar Controls</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/registrar/risk')}
              className="p-3.5 rounded-2xl bg-white/70 hover:bg-slate-50 border border-slate-200/60 text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-slate-800 text-xs">Risk Reviews ({highRiskParcels.length}) ➔</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Scored fraud checks</div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/registrar/risk')}
              className="p-3.5 rounded-2xl bg-white/70 hover:bg-slate-50 border border-slate-200/60 text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-slate-800 text-xs">Court Freezes ({frozenParcels.length}) ➔</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Velocity injunctions</div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/registrar/petitions')}
              className="p-3.5 rounded-2xl bg-white/70 hover:bg-slate-50 border border-slate-200/60 text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-slate-800 text-xs">Overrides Ledger ➔</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Manual clearances</div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/registrar/audit')}
              className="p-3.5 rounded-2xl bg-white/70 hover:bg-slate-50 border border-slate-200/60 text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-slate-800 text-xs">Audit Trail ➔</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Permanent event log</div>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

export default RegistrarDashboardPage;
