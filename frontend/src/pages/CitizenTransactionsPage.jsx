import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  ArrowLeftRight, 
  KeyRound, 
  Bell, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText,
  Plus,
  Copy,
  Check,
  Trash2,
  X
} from 'lucide-react';
import { CadastreDatabaseService } from '../services/databaseService';

export function CitizenTransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTab = searchParams.get('tab') || 'purchases';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { 
    currentUser, 
    transfers, 
    userTransfers, 
    parcels, 
    sellTokens, 
    generateSellToken, 
    revokeSellToken, 
    approveTransferPetition 
  } = useAuth();

  const targetBuyers = CadastreDatabaseService.getTargetBuyers();

  const [search, setSearch] = useState('');
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenParcelId, setTokenParcelId] = useState(parcels[0]?.id || 'UP-0001-CLEAN');
  const [tokenBuyerId, setTokenBuyerId] = useState(targetBuyers[0]?.id || 'USR-BUY-001');
  const [copied, setCopied] = useState(false);
  const [selectedPetition, setSelectedPetition] = useState(null);

  // Switch tab and sync with URL
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Section 1: Purchases & Deeds
  const purchasesList = transfers.filter(
    (t) => t.buyer?.toLowerCase() === currentUser?.name?.toLowerCase() ||
           t.status === 'AWAITING_REGISTRAR' ||
           t.note?.includes('Auto-approve')
  );

  // Section 2: Transfers & Petitions
  const userPetitions = userTransfers.length > 0 ? userTransfers : transfers.slice(0, 15);

  const handleCreateToken = (e) => {
    e.preventDefault();
    const b = targetBuyers.find(x => x.id === tokenBuyerId) || targetBuyers[0];
    generateSellToken(tokenParcelId, b.id, b.name);
    setIsTokenModalOpen(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Transactions & Title Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Purchases and deeds, conveyance petitions, Sell Tokens, and statutory deed alerts.
          </p>
        </div>

        {activeTab === 'tokens' && (
          <button
            type="button"
            onClick={() => setIsTokenModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Sell Token</span>
          </button>
        )}
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabChange('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <span>Purchases & Deeds</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {purchasesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('transfers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-sky-600" />
          <span>Transfers & Petitions</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {userPetitions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('tokens')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tokens'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <KeyRound className="w-4 h-4 text-orange-500" />
          <span>Sell Tokens</span>
          <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {sellTokens.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Purchases & Deeds */}
      {activeTab === 'purchases' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Showing verified purchase agreements and digital deeds ({purchasesList.length})</span>
          </div>

          <div className="space-y-3">
            {purchasesList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3.5 text-xs transition-shadow hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                        {item.id} • {item.ulpin}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        VERIFIED ACQUISITION
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-600 mt-1">
                      Conveyance: <strong className="text-slate-900">{item.seller}</strong> ➔ <strong className="text-slate-900">{item.buyer}</strong>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] font-mono text-slate-400">
                    <div>Claimed Area: <span className="text-slate-700 font-semibold">{item.claimedAreaSqm} m²</span></div>
                    <div>Date: <span className="text-slate-700">{item.transactionDate}</span></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Cryptographic Title Clearance Hash:</span>
                    <span className="font-mono text-sky-600 font-medium break-all">{item.documentHash || '0x71fa...881c'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/citizen/map')}
                    className="text-xs text-sky-600 font-semibold hover:text-sky-700 hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    View Parcel Boundary ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Transfers & Petitions */}
      {activeTab === 'transfers' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Conveyance petitions submitted across owned parcels ({userPetitions.length})</span>
          </div>

          <div className="space-y-3">
            {userPetitions.map((t) => {
              const isSeller = t.seller?.toLowerCase() === currentUser?.name?.toLowerCase();
              const canSign = isSeller && t.status === 'PENDING_APPROVAL';

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3.5 text-xs transition-shadow hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                          {t.id} • {t.ulpin}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'AWAITING_REGISTRAR' || t.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : t.status === 'UNDER_REVIEW'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}
                        >
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-600 mt-1">
                        Seller: <strong className="text-slate-900">{t.seller}</strong> • Buyer: <strong className="text-slate-900">{t.buyer}</strong>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-[11px] font-mono text-slate-400">
                      <div>Area: <span className="text-slate-700 font-semibold">{t.claimedAreaSqm} m²</span></div>
                      <div>Date: <span className="text-slate-700">{t.transactionDate}</span></div>
                    </div>
                  </div>

                  {t.note && (
                    <div className={`p-3 rounded-2xl text-[11px] ${
                      t.note.includes('Wrong') || t.note.includes('Boundary') || t.note.includes('Disputed')
                        ? 'bg-rose-50/80 border border-rose-100 text-rose-800'
                        : 'bg-slate-50 border border-slate-100 text-slate-600'
                    }`}>
                      <strong>Audit Note:</strong> {t.note}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <span className="font-mono text-[10px] text-slate-400 break-all">
                      Digest: {t.documentHash || '0x5fa8901'}
                    </span>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedPetition(t)}
                        className="px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Inspect Filing
                      </button>

                      {canSign && (
                        <button
                          type="button"
                          onClick={() => approveTransferPetition(t.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 text-xs shadow-xs cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sign Approval</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Sell Tokens */}
      {activeTab === 'tokens' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Cryptographic single-use Sell Tokens binding designated buyers ({sellTokens.length})</span>
          </div>

          {sellTokens.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] text-xs space-y-3">
              <KeyRound className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700 text-sm">No Sell Tokens Active</div>
              <p className="text-slate-400 max-w-sm mx-auto text-[11px] leading-relaxed">
                Issue a single-use HMAC token to authorize a specific buyer to submit a conveyance petition for your parcel.
              </p>
              <button
                type="button"
                onClick={() => setIsTokenModalOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-700 shadow-xs cursor-pointer transition-colors"
              >
                + Issue New Sell Token
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sellTokens.map((tok) => (
                <div
                  key={tok.tokenId}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3.5 text-xs transition-shadow hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-orange-500" />
                      <span className="font-mono font-bold text-slate-900 text-sm">{tok.tokenId}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeSellToken(tok.tokenId)}
                      className="text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 font-sans block">Parcel ULPIN:</span>
                      <span className="font-bold text-slate-900">{tok.parcelId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">Authorized Buyer:</span>
                      <span className="font-bold text-slate-900">{tok.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">Expires In:</span>
                      <span className="text-emerald-600 font-bold">{tok.expiresIn}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">Issued At:</span>
                      <span className="text-slate-700">{new Date(tok.createdDate).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 font-mono text-[11px] text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                    <span>{tok.signature}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(tok.signature)}
                      className="text-slate-400 hover:text-white cursor-pointer p-1"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sell Token Modal */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">Issue Sell Token</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTokenModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select Parcel
                </label>
                <select
                  value={tokenParcelId}
                  onChange={(e) => setTokenParcelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-sky-500 font-medium"
                >
                  {parcels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} ({p.surveyNumber} • {p.areaSqm} m²)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Authorized Buyer
                </label>
                <select
                  value={tokenBuyerId}
                  onChange={(e) => setTokenBuyerId(e.target.value)}
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
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-white bg-[#2563eb] hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                Sign & Issue Token
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Petition Modal */}
      {selectedPetition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Petition Record • {selectedPetition.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPetition(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 font-mono text-[11px]">
              <div>ULPIN: {selectedPetition.ulpin}</div>
              <div>Seller: {selectedPetition.seller}</div>
              <div>Buyer: {selectedPetition.buyer}</div>
              <div>Claimed Area: {selectedPetition.claimedAreaSqm} m²</div>
              <div>Filing Date: {selectedPetition.transactionDate}</div>
              <div>Status: {selectedPetition.status}</div>
            </div>

            {selectedPetition.note && (
              <div className="p-3 rounded-xl bg-sky-50 text-slate-700 border border-sky-100">
                <strong>Registry Audit Observation:</strong>
                <p className="mt-1 text-[11px]">{selectedPetition.note}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPetition(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenTransactionsPage;
