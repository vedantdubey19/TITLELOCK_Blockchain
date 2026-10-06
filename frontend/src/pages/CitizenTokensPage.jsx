import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CadastreDatabaseService } from '../services/databaseService';
import { KeyRound, Plus, Copy, Check, Trash2, Clock, X, ShieldCheck } from 'lucide-react';

export function CitizenTokensPage() {
  const { sellTokens, revokeSellToken, parcels, generateSellToken, currentUser } = useAuth();
  const targetBuyers = CadastreDatabaseService.getTargetBuyers();

  const [selectedToken, setSelectedToken] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formParcelId, setFormParcelId] = useState(parcels[0]?.id || 'UP-0041-CLEAN');
  const [formBuyerId, setFormBuyerId] = useState(targetBuyers[0]?.id || 'USR-BUY-001');

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    const buyer = targetBuyers.find((b) => b.id === formBuyerId) || targetBuyers[0];
    const tok = generateSellToken(formParcelId, buyer.id, buyer.name);
    setSelectedToken(tok);
    setIsModalOpen(false);
  };

  const handleCopyPayload = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Cryptographic Sell Tokens (HMAC-SHA256)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Section 5 Standard: Single-use 24-hour authorization tokens binding seller, buyer, ULPIN, and nonce.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Generate New Sell Token</span>
        </button>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Issued Tokens List */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Issued Tokens ({sellTokens.length})
          </div>

          {sellTokens.length === 0 ? (
            <div className="glass-panel rounded-xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
              <p className="text-slate-800 dark:text-slate-200 font-medium">No Sell Tokens issued yet in this session.</p>
              <button
                type="button"
                onClick={handleOpenModal}
                className="mt-2 text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                + Issue token
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sellTokens.map((tok) => (
                <div
                  key={tok.tokenId}
                  onClick={() => setSelectedToken(tok)}
                  className={`p-3.5 rounded-lg cursor-pointer transition-colors border text-xs ${
                    selectedToken?.tokenId === tok.tokenId
                      ? 'bg-sky-500/15 border-sky-500/30 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] border-slate-200/80 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{tok.tokenId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 mt-1">
                    Buyer: {tok.buyerName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between font-mono">
                    <span>ULPIN: {tok.parcelId}</span>
                    <span className="flex items-center gap-1 text-slate-500 font-sans">
                      <Clock className="w-3 h-3" />
                      {tok.expiresIn}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Token Inspector */}
        <div className="lg:col-span-7">
          {selectedToken ? (
            <div className="glass-panel rounded-xl p-5 border border-slate-200/80 dark:border-white/10 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-sky-500" />
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {selectedToken.tokenId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => revokeSellToken(selectedToken.tokenId)}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 font-sans">Bound ULPIN:</span>
                  <div className="text-slate-900 dark:text-white font-bold">{selectedToken.parcelId}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Target Buyer:</span>
                  <div className="text-slate-900 dark:text-white font-bold">{selectedToken.buyerName}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Issued Timestamp:</span>
                  <div className="text-slate-900 dark:text-white">{new Date(selectedToken.createdDate).toLocaleTimeString()}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Time to Live:</span>
                  <div className="text-emerald-600 font-bold">{selectedToken.expiresIn}</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Cryptographic Payload Signature
                </span>
                <div className="p-2.5 rounded-lg bg-black/80 font-mono text-[11px] text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                  <span>{selectedToken.signature}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyPayload(selectedToken.signature)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Select an issued Sell Token on the left to inspect its cryptographic payload.
            </div>
          )}
        </div>

      </div>

      {/* Modal View */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Issue Sell Token
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Select Owned Parcel
                </label>
                <select
                  value={formParcelId}
                  onChange={(e) => setFormParcelId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {parcels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} ({p.surveyNumber} • {p.areaSqm} m²)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Authorized Buyer
                </label>
                <select
                  value={formBuyerId}
                  onChange={(e) => setFormBuyerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {targetBuyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-xs cursor-pointer"
              >
                Issue Cryptographic Token
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenTokensPage;
