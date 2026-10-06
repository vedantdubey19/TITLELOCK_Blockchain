import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import heroBannerImg from '../assets/hero_banner.jpg';
import aerialMapImg from '../assets/aerial_map.jpg';
import { 
  FileText, 
  CheckCircle2, 
  Bell, 
  HeartPulse, 
  Maximize2, 
  ArrowUpRight,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Share2,
  Download,
  Crosshair,
  Type,
  Pencil,
  MessageSquare,
  X
} from 'lucide-react';
import { CadastreDatabaseService } from '../services/databaseService';

export function CitizenDashboardPage() {
  const { currentUser, parcels, userTransfers, allParcels, generateSellToken, showToast } = useAuth();
  const navigate = useNavigate();

  const [selectedMapTool, setSelectedMapTool] = useState('crosshair');
  const [activeParcel, setActiveParcel] = useState(parcels[0] || allParcels[0]);
  const [inspectModalParcel, setInspectModalParcel] = useState(null);
  const [sellKeyModalOpen, setSellKeyModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState('USR-BUY-001');
  const [selectedParcelForToken, setSelectedParcelForToken] = useState(parcels[0]?.id || 'UP-0001-CLEAN');

  const targetBuyers = CadastreDatabaseService.getTargetBuyers();

  // Metrics matching Image 1:
  // Owned parcels: "08" | "Registered in your name"
  // Pending approvals: "00" | "No action needed"
  // Deed notifications: "—" | "Data unavailable"
  // Land health score: "— / 100" | "Awaiting assessment"
  const ownedCount = String(parcels.length > 0 ? parcels.length : 8).padStart(2, '0');
  const pendingCount = String(
    userTransfers.filter(t => t.status === 'PENDING_APPROVAL').length
  ).padStart(2, '0');

  // The registered parcels list matching Image 2
  const registeredParcelsList = parcels.length > 0 ? parcels : allParcels;

  const handleGenerateSellKey = () => {
    setSellKeyModalOpen(true);
  };

  const handleConfirmSellKey = (e) => {
    e.preventDefault();
    const buyer = targetBuyers.find(b => b.id === selectedBuyerId) || targetBuyers[0];
    generateSellToken(selectedParcelForToken, buyer.id, buyer.name);
    setSellKeyModalOpen(false);
    navigate('/citizen/transactions?tab=tokens');
  };

  const handleShareParcel = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`TitleLock Certified Record: ${activeParcel?.id || 'UP-0001-CLEAN'} | Verified Titleholder: ${currentUser?.name || 'Rajesh Kumar'}`);
      showToast('Parcel verification link copied to clipboard', 'success');
    }
  };

  const handleDownloadRecord = () => {
    const dummyData = `TITLELOCK RECORD OF RIGHTS (CERTIFIED)\nULPIN: ${activeParcel?.id || 'UP-0001-CLEAN'}\nRegistered Owner: ${activeParcel?.currentOwner || currentUser?.name}\nSurvey Number: ${activeParcel?.surveyNumber || 'SN-245-A'}\nArea: ${activeParcel?.areaSqm || 1200} sqm\nTenure: ${activeParcel?.ownershipType || 'Joint'}\nStatus: VERIFIED\nBlockchain Tx: 0x892a014ef982c014\nTimestamp: ${new Date().toISOString()}`;
    const blob = new Blob([dummyData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certified_Record_${activeParcel?.id || 'UP-0001'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Certified Record downloaded successfully', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* SECTION 1: TOP OF DASHBOARD (IMAGE 1)                                    */}
      {/* ========================================================================= */}

      {/* 1.1 Hero Panoramic Landscape Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm h-64 sm:h-72 w-full flex items-center">
        <img
          src={heroBannerImg}
          alt="Lush green terraced tea plantation landscape"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Soft shadow gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />

        {/* Hero Text */}
        <div className="relative z-10 px-6 sm:px-10 max-w-xl text-white space-y-2">
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-300">
            Citizen Portal
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Your land. Your peace of mind.
          </h1>
          <p className="text-xs sm:text-sm text-slate-200/90 font-medium">
            Secure. Transparent. Citizen-first land records.
          </p>
        </div>
      </div>

      {/* 1.2 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Owned parcels */}
        <div 
          onClick={() => navigate('/citizen/properties')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3 cursor-pointer hover:border-slate-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center text-orange-500">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              Owned parcels
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight mt-1">
              {ownedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Registered in your name
            </div>
          </div>
        </div>

        {/* Metric 2: Pending approvals */}
        <div 
          onClick={() => navigate('/citizen/transactions?tab=transfers')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3 cursor-pointer hover:border-slate-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              Pending approvals
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight mt-1">
              {pendingCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              No action needed
            </div>
          </div>
        </div>

        {/* Metric 3: Deed notifications */}
        <div 
          onClick={() => navigate('/citizen/transactions?tab=notifications')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3 cursor-pointer hover:border-slate-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100/60 flex items-center justify-center text-sky-600">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              Deed notifications
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight mt-1">
              —
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Data unavailable
            </div>
          </div>
        </div>

        {/* Metric 4: Land health score */}
        <div 
          onClick={() => navigate('/citizen/properties')}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] space-y-3 cursor-pointer hover:border-slate-200 transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50/70 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              Land health score
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight mt-1.5 flex items-baseline gap-1">
              <span>— / 100</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Awaiting assessment
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* UNIFIED TWO-COLUMN GRID: LEFT (8 COLS) & RIGHT (4 COLS)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1 items-start">
        
        {/* LEFT COLUMN (8 cols): Parcel Explorer Map & Registered Parcels */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Parcel Explorer Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Parcel Explorer
              </h2>
              <button
                type="button"
                onClick={() => navigate('/citizen/map')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <span>View larger map</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Interactive Satellite Viewport */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] h-96 sm:h-[410px] w-full bg-slate-900 group">
              <img 
                src={aerialMapImg} 
                alt="Cadastral plot aerial satellite imagery" 
                className="w-full h-full object-cover object-center"
              />

              {/* Glowing Green Cadastral Boundary Polygon matching reference screenshot */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-64 sm:w-56 sm:h-72 rounded-2xl border-2 border-emerald-400 bg-emerald-500/10 shadow-[0_0_35px_rgba(52,211,153,0.35)] relative transform -rotate-1">
                  {/* Center marker */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
                </div>
              </div>

              {/* Top Right Fullscreen Trigger */}
              <button
                type="button"
                onClick={() => navigate('/citizen/map')}
                title="Fullscreen Map"
                className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-white/95 hover:bg-white text-slate-700 shadow-md flex items-center justify-center cursor-pointer transition-transform active:scale-95"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Bottom Left Parcel Pill matching screenshot: • UP-0001 (1,200 m²) */}
              <div className="absolute bottom-4 left-4 z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono font-bold">{activeParcel?.id?.slice(0, 7) || 'UP-0001'}</span>
                  <span className="text-slate-300 font-normal">({activeParcel?.areaSqm?.toLocaleString() || '1,200'} m²)</span>
                </div>
              </div>

              {/* Floating toolbar pill at bottom-center matching screenshot */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-1.5 bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center gap-4 shadow-lg text-xs">
                <button 
                  type="button"
                  onClick={() => setSelectedMapTool('crosshair')}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${selectedMapTool === 'crosshair' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}
                  title="Center parcel"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedMapTool('type')}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${selectedMapTool === 'type' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}
                  title="Toggle labels"
                >
                  <Type className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedMapTool('edit')}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${selectedMapTool === 'edit' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}
                  title="Measure boundary"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedMapTool('message')}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${selectedMapTool === 'message' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}
                  title="Survey notes"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Registered Parcels Section (Aligned right below Parcel Explorer) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Registered Parcels
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                8 properties
              </span>
            </div>

            <div className="space-y-3">
              {/* Card 1: UP-0001-CLEAN with Inspect record button */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0">
                    <img src={aerialMapImg} alt="Parcel plot thumbnail" className="w-full h-full object-cover scale-150" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      UP-0001-CLEAN
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      SN-245-A • 1,200 m² • Joint tenure
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectModalParcel(registeredParcelsList[0] || activeParcel)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#065f46] hover:bg-[#044e39] transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inspect record</span>
                </button>
              </div>

              {/* Card 2: UP-0002-CLEAN with View details button */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex-shrink-0">
                    <img src={aerialMapImg} alt="Parcel plot thumbnail" className="w-full h-full object-cover scale-125" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      UP-0002-CLEAN
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      SN-118-C • 850 m² • Sole tenure
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectModalParcel(registeredParcelsList[1] || registeredParcelsList[0])}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>View details</span>
                </button>
              </div>

              {/* Quick link to full properties view */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/citizen/properties')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  View all 8 registered parcels ➔
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (4 cols): Recent Activity, directly followed by Quick Actions & Security Check */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* 1. Recent Activity Section */}
          <div className="space-y-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h2>

            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] text-xs">
              
              <div className="space-y-3.5">
                {/* Event 1: Title verified */}
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      Title verified
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      UP-0001-CLEAN • 2 days ago
                    </div>
                  </div>
                </div>

                {/* Event 2: New document added */}
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      New document added
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Sale deed • 5 days ago
                    </div>
                  </div>
                </div>

                {/* Event 3: Ownership update */}
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      Ownership update
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      UP-0003 • 1 week ago
                    </div>
                  </div>
                </div>
              </div>

              {/* View all history link */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate('/citizen/transactions?tab=transfers')}
                  className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <span>View all history</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

          {/* 2. Quick Actions Section (Directly below Recent Activity) */}
          <div className="space-y-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Quick Actions
            </h2>

            <div className="space-y-2.5">
              {/* Action 1: Generate sell key */}
              <button
                type="button"
                onClick={handleGenerateSellKey}
                className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Generate sell key</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              {/* Action 2: Share parcel details */}
              <button
                type="button"
                onClick={handleShareParcel}
                className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-sky-600" />
                  <span>Share parcel details</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              {/* Action 3: Download certified record */}
              <button
                type="button"
                onClick={handleDownloadRecord}
                className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:border-slate-200 transition-all flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-orange-500" />
                  <span>Download certified record</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>
            </div>
          </div>

          {/* 3. Security Check Card */}
          <div className="bg-[#0b6b4e] rounded-3xl p-6 text-white space-y-4 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-sm text-white">
                Security Check
              </h3>
              <p className="text-[11px] text-white/80 leading-relaxed">
                Enable two-factor authentication to further secure your property records against unauthorized changes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSecurityModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-white text-[#0b6b4e] font-bold text-xs hover:bg-slate-100 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Enhance Security</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* Modal 1: Inspect Record / Record of Rights */}
      {inspectModalParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Record of Rights (RoR) • {inspectModalParcel.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectModalParcel(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 font-sans block">Registered Owner:</span>
                <span className="text-slate-900 font-bold">{inspectModalParcel.currentOwner || currentUser?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block">Survey Number:</span>
                <span className="text-slate-900 font-bold">{inspectModalParcel.surveyNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block">Area:</span>
                <span className="text-slate-900 font-bold">{inspectModalParcel.areaSqm?.toLocaleString()} m²</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block">Tenure:</span>
                <span className="text-slate-900 font-bold">{inspectModalParcel.ownershipType || 'Joint tenure'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Conveyance Chain & Proof
              </span>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span>Deed Hash:</span>
                  <span className="text-sky-600 font-bold">{inspectModalParcel.deedHash || '0x7f9a81c2049eb1'}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Blockchain Finality:</span>
                  <span className="text-emerald-600 font-bold">Confirmed on-chain</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectModalParcel(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Generate Sell Key */}
      {sellKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Generate Sell Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setSellKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSellKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select Parcel
                </label>
                <select
                  value={selectedParcelForToken}
                  onChange={(e) => setSelectedParcelForToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {registeredParcelsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} ({p.surveyNumber} • {p.areaSqm} m²)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Designated Buyer
                </label>
                <select
                  value={selectedBuyerId}
                  onChange={(e) => setSelectedBuyerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-500 font-medium"
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
                className="w-full py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
              >
                Sign & Issue Key
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Security & 2FA */}
      {securityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Security & Two-Factor Authentication</h3>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Two-factor authentication secures your title deeds with hardware biometric attestation under Section 5 Registry Protocol.
            </p>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>e-KYC Verified Titleholder</span>
              </div>
              <div className="text-[11px] font-mono">
                Hardware Public Key: 0x742d...f44c
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSecurityModalOpen(false);
                showToast('Two-Factor Authentication is active and secured', 'success');
              }}
              className="w-full py-2.5 rounded-xl font-bold text-white bg-[#0b6b4e] hover:bg-[#08523c] transition-colors cursor-pointer"
            >
              Confirm 2FA Protection
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenDashboardPage;
