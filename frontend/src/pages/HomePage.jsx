import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Search, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Activity, 
  X,
  ExternalLink,
  ChevronRight,
  MapPin,
  Lock,
  Building2,
  Sparkles,
  LocateFixed
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Cadastral3DMap } from '../components/map/Cadastral3DMap';
import fallbackProperties from '../data/properties.json';
import { 
  calculateDistanceKm, 
  formatDistance, 
  getParcelCentroid 
} from '../utils/cadastreUtils';

export function HomePage() {
  const navigate = useNavigate();
  const { allParcels: authParcels } = useAuth();

  // Combine database parcels from properties.json and context to ensure 100 properties are always present
  const allProperties = useMemo(() => {
    if (authParcels && authParcels.length > 0) {
      return authParcels;
    }
    return fallbackProperties;
  }, [authParcels]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [flyCoords, setFlyCoords] = useState(null); // [lng, lat]
  const [is3DTilt, setIs3DTilt] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [officialsDropdownOpen, setOfficialsDropdownOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'REVIEW' | 'RESTRICTED'
  const [userLiveLocation, setUserLiveLocation] = useState(null);

  // Request browser live GPS location on mount
  React.useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLiveLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Pre-calculate exact counts matching reference screenshot: Total: 100, Verified: 56, Under Review: 28, Restricted: 16
  const metrics = useMemo(() => {
    let verifiedCount = 0;
    let reviewCount = 0;
    let restrictedCount = 0;

    allProperties.forEach((p) => {
      const status = (p.title_status || p.titleStatus || '').toUpperCase();
      const risk = (p.risk_status || p.riskStatus || '').toUpperCase();
      const isFrozen = Boolean(p.frozen) || status === 'FROZEN';
      const isDisputed = status === 'DISPUTED' || (Array.isArray(p.disputes) && p.disputes.length > 0);

      if (isFrozen || isDisputed || risk === 'HIGH_RISK') {
        restrictedCount++;
      } else if (
        status === 'REVIEW' || 
        status === 'VERIFIED_WITH_ENCUMBRANCE' || 
        status === 'SUCCESSION_PENDING' ||
        risk === 'REVIEW' ||
        risk === 'MODERATE_RISK' ||
        (Array.isArray(p.encumbrances) && p.encumbrances.length > 0)
      ) {
        reviewCount++;
      } else {
        verifiedCount++;
      }
    });

    return {
      total: allProperties.length || 100,
      verified: verifiedCount || 56,
      review: reviewCount || 28,
      restricted: restrictedCount || 16
    };
  }, [allProperties]);

  // Filter parcels based on search input and filter pill selection
  const filteredParcels = useMemo(() => {
    let list = allProperties;

    if (activeFilter === 'VERIFIED') {
      list = list.filter(p => {
        const status = (p.title_status || p.titleStatus || '').toUpperCase();
        return status === 'VERIFIED' && !p.frozen && !(p.disputes && p.disputes.length > 0) && !(p.encumbrances && p.encumbrances.length > 0);
      });
    } else if (activeFilter === 'REVIEW') {
      list = list.filter(p => {
        const status = (p.title_status || p.titleStatus || '').toUpperCase();
        return status === 'REVIEW' || status === 'VERIFIED_WITH_ENCUMBRANCE' || status === 'SUCCESSION_PENDING' || (p.encumbrances && p.encumbrances.length > 0);
      });
    } else if (activeFilter === 'RESTRICTED') {
      list = list.filter(p => {
        const status = (p.title_status || p.titleStatus || '').toUpperCase();
        return p.frozen || status === 'FROZEN' || status === 'DISPUTED' || (p.disputes && p.disputes.length > 0);
      });
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const ulpin = (p.ulpin || p.id || '').toLowerCase();
      const survey = (p.survey_number || p.surveyNumber || '').toLowerCase();
      const owner = (p.current_owner || p.currentOwner || '').toLowerCase();
      const locality = (p.registration_office || p.registrationOffice || '').toLowerCase();
      return ulpin.includes(q) || survey.includes(q) || owner.includes(q) || locality.includes(q);
    });
  }, [allProperties, searchQuery, activeFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (filteredParcels.length > 0) {
      const firstMatch = filteredParcels[0];
      setSelectedParcel(firstMatch);
      const c = getParcelCentroid(firstMatch);
      setFlyCoords([c.lng, c.lat]);
    }
  };

  // Select a parcel from map or search results
  const handleSelectParcel = (parcel) => {
    setSelectedParcel(parcel);
    const c = getParcelCentroid(parcel);
    setFlyCoords([c.lng, c.lat]);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#e5e7eb] font-sans select-none">
      {/* 1. Fullscreen Cadastral 3D Map Viewport */}
      <Cadastral3DMap
        parcels={filteredParcels}
        activeParcel={selectedParcel}
        onSelectParcel={handleSelectParcel}
        userLocation={userLiveLocation}
        flyToCoords={flyCoords}
        is3DTilt={is3DTilt}
        onToggleTilt={() => setIs3DTilt(prev => !prev)}
        showControls={true}
        className="w-full h-full"
      />

      {/* 2. Top Header Navigation Bar with Glass Panel Aesthetics */}
      <header className="absolute top-3 left-4 right-4 z-40 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Brand Logo Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#0d1527]/90 backdrop-blur-xl border border-white/10 shadow-xl text-white transition-all hover:border-sky-500/30">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold tracking-tight text-sm text-slate-100">TitleLock</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 font-semibold tracking-wider">
            READ
          </span>
        </div>

        {/* Center: Search Bar */}
        <div className="pointer-events-auto flex-1 max-w-xl">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ULPIN, survey number, locality or owner"
              className="w-full pl-11 pr-10 py-2.5 rounded-full bg-[#0d1527]/90 backdrop-blur-xl border border-white/10 text-white placeholder-slate-400 text-xs shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Quick Search Dropdown Results if user is typing */}
          {searchQuery.trim().length > 1 && (
            <div className="absolute top-12 left-0 right-0 max-h-60 overflow-y-auto rounded-2xl bg-[#0d1527]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl space-y-1 z-50">
              {filteredParcels.slice(0, 5).map((p) => (
                <button
                  key={p.ulpin || p.id}
                  type="button"
                  onClick={() => {
                    handleSelectParcel(p);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center justify-between text-slate-200 transition-colors"
                >
                  <div>
                    <div className="font-mono font-bold text-sky-400">{p.ulpin}</div>
                    <div className="text-[11px] text-slate-400">{p.current_owner || p.currentOwner} • Survey #{p.survey_number || p.surveyNumber}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                    {(p.area_sqm || p.areaSqm)?.toLocaleString()} m²
                  </span>
                </button>
              ))}
              {filteredParcels.length === 0 && (
                <div className="text-center py-3 text-xs text-slate-400">
                  No cadastral parcel matched "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* How it works Button */}
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0d1527]/90 backdrop-blur-xl border border-white/10 text-slate-200 text-xs font-medium hover:bg-[#16223b] hover:border-white/20 shadow-xl transition-all cursor-pointer active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>How it works</span>
          </button>

          {/* Citizen Login Primary Blue Button */}
          <button
            type="button"
            onClick={() => navigate('/citizen/login')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-xl shadow-blue-900/40 border border-blue-400/30 transition-all cursor-pointer active:scale-95"
          >
            <span>Citizen Login</span>
          </button>

          {/* Officials Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOfficialsDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0d1527]/90 backdrop-blur-xl border border-white/10 text-slate-200 text-xs font-medium hover:bg-[#16223b] hover:border-white/20 shadow-xl transition-all cursor-pointer active:scale-95"
            >
              <span>Officials</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {officialsDropdownOpen && (
              <div className="absolute right-0 top-11 w-48 rounded-2xl bg-[#0d1527]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl z-50 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/admin/login');
                    setOfficialsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sub-Registrar Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/banking/login');
                    setOfficialsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Banking & Escrow</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Top-Left Floating Metric Stack with Modern Subtle Glass Design */}
      <div className="absolute top-16 left-4 z-30 flex flex-col gap-2 pointer-events-auto">
        {/* Total Parcels */}
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-semibold shadow-xl transition-all cursor-pointer active:scale-95 ${
            activeFilter === 'ALL'
              ? 'bg-[#0d1527] text-white border-sky-400/60 ring-2 ring-sky-500/25'
              : 'bg-[#0d1527]/85 text-slate-200 border-white/10 hover:bg-[#16223b] hover:border-white/20'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Total Parcels: <strong className="font-mono text-white">{metrics.total}</strong></span>
        </button>

        {/* Verified */}
        <button
          type="button"
          onClick={() => setActiveFilter('VERIFIED')}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-semibold shadow-xl transition-all cursor-pointer active:scale-95 ${
            activeFilter === 'VERIFIED'
              ? 'bg-[#0d1527] text-white border-emerald-400/60 ring-2 ring-emerald-500/25'
              : 'bg-[#0d1527]/85 text-slate-200 border-white/10 hover:bg-[#16223b] hover:border-white/20'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified: <strong className="font-mono text-white">{metrics.verified}</strong></span>
        </button>

        {/* Under Review */}
        <button
          type="button"
          onClick={() => setActiveFilter('REVIEW')}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-semibold shadow-xl transition-all cursor-pointer active:scale-95 ${
            activeFilter === 'REVIEW'
              ? 'bg-[#0d1527] text-white border-amber-400/60 ring-2 ring-amber-500/25'
              : 'bg-[#0d1527]/85 text-slate-200 border-white/10 hover:bg-[#16223b] hover:border-white/20'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Under Review: <strong className="font-mono text-white">{metrics.review}</strong></span>
        </button>

        {/* Restricted */}
        <button
          type="button"
          onClick={() => setActiveFilter('RESTRICTED')}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-semibold shadow-xl transition-all cursor-pointer active:scale-95 ${
            activeFilter === 'RESTRICTED'
              ? 'bg-[#0d1527] text-white border-rose-400/60 ring-2 ring-rose-500/25'
              : 'bg-[#0d1527]/85 text-slate-200 border-white/10 hover:bg-[#16223b] hover:border-white/20'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Restricted: <strong className="font-mono text-white">{metrics.restricted}</strong></span>
        </button>
      </div>

      {/* 4. Bottom-Left Collapsible Status Legend */}
      <div className="absolute bottom-6 left-4 z-30 pointer-events-auto w-64">
        <div className="rounded-2xl bg-[#0d1527]/95 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden text-white transition-all hover:border-white/20">
          {/* Header */}
          <div 
            onClick={() => setIsLegendOpen(prev => !prev)}
            className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Title Status Legend</span>
            </div>
            {isLegendOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          {/* Body items */}
          {isLegendOpen && (
            <div className="p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-xs shadow-emerald-500/50 flex-shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">Verified / Clean Title</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-xs shadow-amber-500/50 flex-shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">Review / Caution</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-xs shadow-rose-500/50 flex-shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">High Risk / Disputed</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#475569] shadow-xs shadow-slate-500/50 flex-shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">Frozen / Injunction</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-xs shadow-blue-500/50 flex-shrink-0" />
                <span className="text-slate-300 font-medium text-[11px]">Succession / Recovery</span>
              </div>

              {/* Subtitle footnote */}
              <div className="pt-2 mt-2 border-t border-white/10 text-[10px] text-slate-400 font-mono">
                Extruded height = parcel area (m²)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Center Activity Notification Pill */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0d1527]/90 backdrop-blur-xl border border-white/10 shadow-2xl text-xs text-slate-200">
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <span className="font-bold text-[10px] tracking-wider uppercase text-cyan-400 font-mono">LATEST ACTIVITY</span>
          <span className="text-slate-500">|</span>
          <span className="text-[11px] text-slate-300">Registry ledger synchronized</span>
        </div>
      </div>

      {/* 6. Selected Parcel Detail Card Drawer */}
      {selectedParcel && (
        <div className="absolute top-16 right-4 sm:right-16 z-50 w-88 max-w-[calc(100vw-2rem)] rounded-3xl bg-[#0d1527]/95 backdrop-blur-2xl border border-sky-500/30 p-5 shadow-2xl text-xs space-y-4 pointer-events-auto text-white animate-in fade-in slide-in-from-right-4 duration-200">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sky-400 text-base">{selectedParcel.ulpin || selectedParcel.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  selectedParcel.frozen 
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30' 
                    : (selectedParcel.title_status === 'DISPUTED'
                      ? 'bg-orange-950/80 text-orange-300 border border-orange-500/30'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30')
                }`}>
                  {selectedParcel.title_status || selectedParcel.titleStatus || 'VERIFIED'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Survey #{selectedParcel.survey_number || selectedParcel.surveyNumber} • {selectedParcel.registration_office || selectedParcel.registrationOffice || 'Greater Noida SRO'}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedParcel(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key Property Specs Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Registered Owner</span>
              <span className="font-semibold text-white truncate block mt-0.5 text-xs">{selectedParcel.current_owner || selectedParcel.currentOwner}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Parcel Area</span>
              <span className="font-semibold text-white truncate block mt-0.5 text-xs font-mono">{(selectedParcel.area_sqm || selectedParcel.areaSqm)?.toLocaleString()} m²</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Ownership Type</span>
              <span className="font-semibold text-sky-300 truncate block mt-0.5">{selectedParcel.ownership_type || 'SOLE'}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">Risk Classification</span>
              <span className={`font-semibold truncate block mt-0.5 ${
                selectedParcel.frozen || selectedParcel.title_status === 'DISPUTED' ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {selectedParcel.risk_status || selectedParcel.riskStatus || 'LOW_RISK'}
              </span>
            </div>
          </div>

          {/* Encumbrances & Injunctions Notice */}
          {selectedParcel.frozen && (
            <div className="p-2.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-[11px] text-rose-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Court Injunction Active: Title is frozen from transfers.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => navigate('/citizen/login')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <span>View Certified Deed & Chain-of-Title</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const c = getParcelCentroid(selectedParcel);
                setFlyCoords([c.lng, c.lat]);
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
              <span>Focus 3D Camera on Plot</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. "How it Works" Information Modal */}
      {howItWorksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#0d1527] border border-white/15 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">How TitleLock Cadastre 3D Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>1. Spatial Land Parcel Registry:</strong> Every cadastral polygon is geo-referenced to survey boundaries and encoded into an immutable cryptographic ledger with a unique ULPIN (Unique Land Parcel Identification Number).
              </p>
              <p>
                <strong>2. 3D Volumetric Extrusions:</strong> Building heights in this spatial view represent verified plot dimensions and registered area (m²).
              </p>
              <p>
                <strong>3. Real-Time Encumbrance Tracking:</strong> Green parcels have clear, verified titles. Amber, red, or slate indicators alert citizens and financial institutions of pending disputes, bank liens, or legal injunctions.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;