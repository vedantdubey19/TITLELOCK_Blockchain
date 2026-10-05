import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { TARGET_BUYERS } from '../constants/mockData';
import { KeyRound, Plus, Copy, Check, Trash2, Clock, X } from 'lucide-react';

export function CitizenTokensPage() {
  const { sellTokens, revokeSellToken, parcels, generateSellToken } = useAuth();
  const [selectedToken, setSelectedToken] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formParcelId, setFormParcelId] = useState(parcels[0]?.id || '');
  const [formBuyerId, setFormBuyerId] = useState(TARGET_BUYERS[0]?.id || '');

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    const buyer = TARGET_BUYERS.find((b) => b.id === formBuyerId) || TARGET_BUYERS[0];
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
                      24h window
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Payload Inspector */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-xl p-5 min-h-[220px] flex flex-col justify-center text-xs border border-slate-200/80 dark:border-white/10">
            {selectedToken ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">Payload: {selectedToken.tokenId}</span>
                  </div>
                  <button
                    onClick={() => revokeSellToken(selectedToken.tokenId)}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                </div>

                <div className="space-y-1 font-mono text-[11px] bg-slate-950 text-emerald-400 p-3.5 rounded-lg break-all border border-slate-800">
                  <div>"token_id": "{selectedToken.tokenId}",</div>
                  <div>"seller_signature": "{selectedToken.signature}",</div>
                  <div>"ulpin_binding": "{selectedToken.parcelId}",</div>
                  <div>"designated_buyer": "{selectedToken.buyerName} ({selectedToken.buyerId})",</div>
                  <div>"cryptographic_algorithm": "HMAC-SHA256",</div>
                  <div>"status": "VALID_AWAITING_PETITION"</div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Ready for buyer petition</span>
                  <button
                    onClick={() => handleCopyPayload(JSON.stringify(selectedToken, null, 2))}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-xs">
                Select a Sell Token from the left list to inspect its cryptographic payload.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Generate HMAC-SHA256 Sell Token
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="py-3.5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Select Property (ULPIN)</label>
                <select
                  value={formParcelId}
                  onChange={(e) => setFormParcelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {parcels.filter(p => p.status !== 'FROZEN').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.surveyNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Designated Buyer</label>
                <select
                  value={formBuyerId}
                  onChange={(e) => setFormBuyerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {TARGET_BUYERS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[11px] text-sky-800 dark:text-sky-200">
                Single-use 24-hour cryptographic authorization binding your seller key to this buyer and parcel.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg font-medium bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                >
                  Sign & Issue Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenTokensPage;
