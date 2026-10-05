import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { TARGET_BUYERS } from '../constants/mockData';
import { KeyRound, FileText, X, CheckCircle2 } from 'lucide-react';

export function CitizenPropertiesPage() {
  const { parcels, generateSellToken, sellTokens } = useAuth();
  const [selectedBuyer, setSelectedBuyer] = useState(TARGET_BUYERS[0].id);

  const [modalParcel, setModalParcel] = useState(null);
  const [actionType, setActionType] = useState('token');
  const [issuedToken, setIssuedToken] = useState(null);

  const handleGenerateClick = (parcel) => {
    setModalParcel(parcel);
    setActionType('token');
    setIssuedToken(null);
  };

  const handleDeedClick = (parcel) => {
    setModalParcel(parcel);
    setActionType('deed');
  };

  const confirmGenerateToken = () => {
    const buyerObj = TARGET_BUYERS.find((b) => b.id === selectedBuyer) || TARGET_BUYERS[0];
    const tok = generateSellToken(modalParcel.id, buyerObj.id, buyerObj.name);
    setIssuedToken(tok);
  };

  return (
    <div className="space-y-5">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            My Registered Properties & Transfer Authorization
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review cadastral titles, consent to conveyance petitions, and issue single-use cryptographic Sell Tokens.
          </p>
        </div>

        <Link
          to="/citizen/tokens"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
          <span>View All Sell Tokens ({sellTokens.length})</span>
        </Link>
      </div>

      {/* 2. Target Buyer Bar */}
      <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
          <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Target Buyer for Sell Token Issuance:</span>
        </div>

        <div className="sm:w-72">
          <select
            value={selectedBuyer}
            onChange={(e) => setSelectedBuyer(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {TARGET_BUYERS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Parcel Property Cards List */}
      <div className="space-y-2.5">
        {parcels.map((p) => {
          const isFlagged = p.status === 'FROZEN' || p.status === 'SUCCESSION PENDING';

          return (
            <div
              key={p.id}
              className="glass-panel rounded-xl p-4 border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              {/* Left Property Metadata */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {p.title}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      p.status === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : p.status === 'DISPUTED'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : p.status === 'FROZEN'
                        ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
                        : p.status.includes('ENCUMBRANCE')
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    • {p.status}
                  </span>

                  <span className="text-slate-500 dark:text-slate-400">
                    Health: <strong className="text-slate-800 dark:text-slate-200 font-mono">{p.health}</strong>
                  </span>
                </div>

                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap text-[11px]">
                  <span>Survey: <strong className="text-slate-700 dark:text-slate-300 font-mono">{p.surveyNumber}</strong></span>
                  <span>Area: <strong className="text-slate-700 dark:text-slate-300 font-mono">{p.areaSqm.toLocaleString()} m²</strong></span>
                  {p.tenure && <span>Tenure: <strong className="text-slate-700 dark:text-slate-300">{p.tenure}</strong></span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 mt-2 md:mt-0">
                <button
                  type="button"
                  onClick={() => handleDeedClick(p)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer text-center"
                >
                  Full Deed Record →
                </button>

                <button
                  type="button"
                  disabled={isFlagged}
                  onClick={() => handleGenerateClick(p)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                    isFlagged
                      ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-white/5'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Generate Sell Token</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {modalParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-white/10">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                {actionType === 'token' ? (
                  <>
                    <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Issue Single-Use Cryptographic Sell Token
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Full Cadastral Deed Record
                  </>
                )}
              </h3>
              <button
                onClick={() => setModalParcel(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionType === 'token' ? (
              !issuedToken ? (
                <div className="py-4 space-y-3.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-200 dark:border-white/5 space-y-1">
                    <div className="text-slate-900 dark:text-white"><strong>Selected Title:</strong> {modalParcel.id}</div>
                    <div className="text-slate-500 dark:text-slate-400">Survey: {modalParcel.surveyNumber} • Area: {modalParcel.areaSqm} m²</div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Recipient Buyer:
                    </label>
                    <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-800 dark:text-sky-200 font-medium">
                      {TARGET_BUYERS.find((b) => b.id === selectedBuyer)?.name} ({selectedBuyer})
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    By confirming, you cryptographically sign this sell authorization. The buyer will receive a 48-hour window to submit an on-chain transfer petition.
                  </p>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setModalParcel(null)}
                      className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmGenerateToken}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Sign & Issue Token
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-3 text-center text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto" />
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Sell Token Generated!</h4>
                  <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-lg text-left font-mono space-y-1 text-[11px] border border-slate-200 dark:border-white/5">
                    <div><strong className="text-slate-500 dark:text-slate-400">Token ID:</strong> <span className="text-emerald-600 dark:text-emerald-400">{issuedToken.tokenId}</span></div>
                    <div><strong className="text-slate-500 dark:text-slate-400">Target Buyer:</strong> <span className="text-slate-800 dark:text-slate-200">{issuedToken.buyerName}</span></div>
                    <div><strong className="text-slate-500 dark:text-slate-400">Signature:</strong> <span className="text-sky-600 dark:text-sky-400">{issuedToken.signature}</span></div>
                    <div><strong className="text-slate-500 dark:text-slate-400">Status:</strong> <span className="text-amber-600 dark:text-amber-400">Active (Expires in 48h)</span></div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setModalParcel(null)}
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="py-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-200 dark:border-white/5">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Tenure</span>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">{modalParcel.tenure || 'SOLE'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Health Score</span>
                    <div className="font-mono text-slate-900 dark:text-white mt-0.5">{modalParcel.healthScore} / 100</div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Primary Titleholder</span>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">{modalParcel.primaryOwner}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Area</span>
                    <div className="font-mono text-slate-900 dark:text-white mt-0.5">{modalParcel.areaSqm} m²</div>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Deed Hash:</span>
                  <div className="p-2.5 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] break-all border border-slate-800">
                    {modalParcel.deedHash}
                  </div>
                </div>

                {modalParcel.encumbranceDetails && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                    <strong>Encumbrance Notice:</strong> {modalParcel.encumbranceDetails}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setModalParcel(null)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                  >
                    Close Record
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

export default CitizenPropertiesPage;
