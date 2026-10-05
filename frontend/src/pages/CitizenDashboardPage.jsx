import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { TARGET_BUYERS } from '../constants/mockData';
import { 
  Building2, 
  KeyRound, 
  Eye, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  Clock
} from 'lucide-react';

export function CitizenDashboardPage() {
  const { currentUser, activeRoleView, setActiveRoleView, parcels, generateSellToken } = useAuth();
  const navigate = useNavigate();

  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState(TARGET_BUYERS[0].id);
  const [tokenCreated, setTokenCreated] = useState(null);
  const [inspectParcel, setInspectParcel] = useState(null);

  const handleOpenTokenModal = (parcel) => {
    setSelectedParcel(parcel);
    setTokenCreated(null);
  };

  const handleCreateToken = () => {
    const buyer = TARGET_BUYERS.find((b) => b.id === selectedBuyerId) || TARGET_BUYERS[0];
    const token = generateSellToken(selectedParcel.id, buyer.id, buyer.name);
    setTokenCreated(token);
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Header Card */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                VERIFIED CITIZEN
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                ID: {currentUser?.id || 'USR-001'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Welcome, {currentUser?.name || 'Citizen Landholder'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              TitleLock Cadastral Portal • Jurisdiction: Gautam Buddha Nagar, Uttar Pradesh
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <Link
              to="/citizen/properties"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>My Properties ({parcels.length})</span>
            </Link>
            <Link
              to="/citizen/map"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors"
            >
              <span>3D Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Role toggle */}
        <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Active Role:
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-white/10">
              {['OWNER', 'BUYER', 'NOMINEE'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRoleView(role)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    activeRoleView === role
                      ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Data source: dashboard_views.{activeRoleView}
          </span>
        </div>
      </div>

      {/* 2. 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-panel glass-card-interactive rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Owned Parcels</span>
            <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {parcels.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            All registered in Record of Rights
          </p>
        </div>

        <div className="glass-panel glass-card-interactive rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            0
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Requires seller quorum
          </p>
        </div>

        <div className="glass-panel glass-card-interactive rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Deed Notifications</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-medium text-slate-700 dark:text-slate-300">
            Unavailable
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Unread statutory alerts
          </p>
        </div>

        <div className="glass-panel glass-card-interactive rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Avg Title Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-medium text-slate-700 dark:text-slate-300">
            Unavailable <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cadastral Standing
          </p>
        </div>
      </div>

      {/* 3. Action Items Banner */}
      <div className="p-3.5 rounded-2xl glass-panel-subtle flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">
            Priority Action Items ({activeRoleView})
          </span>
        </div>
        <span className="text-slate-500">
          0 items requiring attention
        </span>
      </div>

      {/* 4. Registered Cadastral Parcels List */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              My Registered Cadastral Parcels
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Parcels where you are recorded as legal titleholder.
            </p>
          </div>
          <Link
            to="/citizen/properties"
            className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 font-medium"
          >
            Manage All ({parcels.length}) →
          </Link>
        </div>

        <div className="space-y-2.5">
          {parcels.map((parcel) => (
            <div
              key={parcel.id}
              className="p-3.5 rounded-xl glass-panel-subtle hover:border-sky-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {parcel.title}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      parcel.status === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : parcel.status === 'DISPUTED'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : parcel.status === 'FROZEN'
                        ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
                        : parcel.status.includes('ENCUMBRANCE')
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    • {parcel.status}
                  </span>

                  <span className="text-slate-500 dark:text-slate-400">
                    Health: <strong className="text-slate-800 dark:text-slate-200 font-mono">{parcel.health}</strong>
                  </span>
                </div>

                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap text-[11px]">
                  <span>Survey: <strong className="text-slate-700 dark:text-slate-300 font-mono">{parcel.surveyNumber}</strong></span>
                  <span>Area: <strong className="text-slate-700 dark:text-slate-300 font-mono">{parcel.areaSqm.toLocaleString()} m²</strong></span>
                  {parcel.tenure && <span>Tenure: <strong className="text-slate-700 dark:text-slate-300">{parcel.tenure}</strong></span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 mt-2 md:mt-0">
                <button
                  type="button"
                  onClick={() => setInspectParcel(parcel)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer text-center"
                >
                  Inspect Record →
                </button>

                <button
                  type="button"
                  disabled={parcel.status === 'FROZEN'}
                  onClick={() => handleOpenTokenModal(parcel)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                    parcel.status === 'FROZEN'
                      ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-white/5'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                  }`}
                >
                  Generate Sell Key
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INSPECT RECORD MODAL */}
      {inspectParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Cadastral Deed Record
                </h3>
                <span className="font-mono text-xs text-sky-700 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {inspectParcel.id}
                </span>
              </div>
              <button
                onClick={() => setInspectParcel(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-200 dark:border-white/5">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Registered Owner</div>
                  <div className="font-medium text-slate-900 dark:text-white mt-0.5">{inspectParcel.primaryOwner}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Survey Number</div>
                  <div className="font-mono text-slate-900 dark:text-white mt-0.5">{inspectParcel.surveyNumber}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Area</div>
                  <div className="font-mono text-slate-900 dark:text-white mt-0.5">{inspectParcel.areaSqm} m²</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Registry Date</div>
                  <div className="font-mono text-slate-900 dark:text-white mt-0.5">{inspectParcel.registeredDate}</div>
                </div>
              </div>

              <div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-1 font-mono uppercase">Deed Hash</div>
                <div className="p-2.5 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] break-all border border-slate-800">
                  {inspectParcel.deedHash}
                </div>
              </div>

              <div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mb-1 font-mono uppercase">Blockchain Verification Tx</div>
                <div className="p-2.5 rounded bg-slate-900 text-sky-400 font-mono text-[11px] break-all border border-slate-800">
                  {inspectParcel.blockchainTx}
                </div>
              </div>

              {inspectParcel.flagReason && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                  <strong>Notice:</strong> {inspectParcel.flagReason}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setInspectParcel(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE SELL KEY MODAL */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Generate Sell Key / Token
              </h3>
              <button
                onClick={() => setSelectedParcel(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!tokenCreated ? (
              <div className="py-4 space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-200 dark:border-white/5">
                  <div className="font-medium text-slate-900 dark:text-white">Target Parcel: {selectedParcel.id}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Area: {selectedParcel.areaSqm} m² • Survey: {selectedParcel.surveyNumber}</div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Select Verified Buyer:
                  </label>
                  <select
                    value={selectedBuyerId}
                    onChange={(e) => setSelectedBuyerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    {TARGET_BUYERS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[11px] text-sky-800 dark:text-sky-200">
                  Single-use 24-hour cryptographic authorization binding your seller key to this buyer and parcel.
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedParcel(null)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateToken}
                    className="px-3.5 py-1.5 rounded-lg font-medium text-white bg-sky-600 hover:bg-sky-500 cursor-pointer"
                  >
                    Issue Cryptographic Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-3 text-center text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto" />
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Token Successfully Issued!</h4>
                <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-lg text-left font-mono space-y-1 text-[11px] border border-slate-200 dark:border-white/5">
                  <div><strong className="text-slate-500 dark:text-slate-400">Token ID:</strong> <span className="text-emerald-600 dark:text-emerald-400">{tokenCreated.tokenId}</span></div>
                  <div><strong className="text-slate-500 dark:text-slate-400">Buyer:</strong> <span className="text-slate-800 dark:text-slate-200">{tokenCreated.buyerName}</span></div>
                  <div><strong className="text-slate-500 dark:text-slate-400">Signature:</strong> <span className="text-sky-600 dark:text-sky-400">{tokenCreated.signature}</span></div>
                  <div><strong className="text-slate-500 dark:text-slate-400">Validity:</strong> <span className="text-amber-600 dark:text-amber-400">48 Hours</span></div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedParcel(null);
                      navigate('/citizen/tokens');
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 cursor-pointer"
                  >
                    View All Sell Tokens →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenDashboardPage;
