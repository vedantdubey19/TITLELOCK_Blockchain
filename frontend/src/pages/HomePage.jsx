import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  LocateFixed, 
  Building2, 
  Layers, 
  Search, 
  ArrowRight, 
  LogIn, 
  CheckCircle2, 
  Sparkles, 
  Compass, 
  ExternalLink,
  ChevronRight,
  Database,
  Eye,
  Info,
  X,
  Lock,
  Globe2,
  FileCheck,
  Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ThreeGlobeBackground } from '../components/map/ThreeGlobeBackground';
import { Cadastral3DMap } from '../components/map/Cadastral3DMap';
import { 
  calculateDistanceKm, 
  formatDistance, 
  getParcelCentroid 
} from '../utils/cadastreUtils';

export function HomePage() {
  const navigate = useNavigate();
  const { allParcels } = useAuth();
  const { theme } = useTheme();

  // Mode: 'globe' | 'map3d'
  const [viewMode, setViewMode] = useState('globe');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // User Geolocation state
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  // Selected Parcel state
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');

  // Target coordinates for 3D map fly-to
  const [flyCoords, setFlyCoords] = useState([77.5148, 28.4633]);

  // Handle click on Globe location to dive smoothly into 3D Map at the exact clicked spot
  const handleGlobeLocationClick = (coords) => {
    setIsTransitioning(true);
    
    if (coords && coords.lat != null && coords.lng != null) {
      // Find closest database parcel if within realistic proximity (< 50km)
      let bestParcel = null;
      let minDistance = Infinity;

      allParcels.forEach((p) => {
        const c = getParcelCentroid(p);
        const dist = calculateDistanceKm(coords.lat, coords.lng, c.lat, c.lng);
        if (dist != null && dist < minDistance) {
          minDistance = dist;
          bestParcel = p;
        }
      });

      if (bestParcel && minDistance < 50) {
        setSelectedParcel(bestParcel);
      } else {
        setSelectedParcel(null);
      }

      // Fly directly to the exact clicked coordinates [lng, lat]
      setFlyCoords([coords.lng, coords.lat]);
    } else {
      setFlyCoords([77.5148, 28.4633]);
    }

    setTimeout(() => {
      setViewMode('map3d');
      setIsTransitioning(false);
    }, 450);
  };

  // Request high-accuracy GPS location
  const handleEnableLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation not supported by browser.');
      return;
    }

    setLocatingUser(true);
    setLocationMessage('Connecting to GPS satellites...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(coords);
        setLocationMessage(`GPS locked: ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`);
        setLocatingUser(false);

        triggerFlyToLocation([coords.lng, coords.lat]);
      },
      (err) => {
        console.warn('Geolocation dismiss:', err);
        setLocatingUser(false);
        setLocationMessage('Location permission denied. Showing primary registry center.');
        triggerFlyToLocation([77.5148, 28.4633]);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  };

  // Smooth cinematic flight transition
  const triggerFlyToLocation = (targetLngLat) => {
    setIsTransitioning(true);
    setFlyCoords(targetLngLat);

    setTimeout(() => {
      setViewMode('map3d');
      setIsTransitioning(false);
    }, 400);
  };

  // Filter parcels
  const filteredParcels = useMemo(() => {
    return allParcels.filter(p => {
      const matchSearch = 
        !searchQuery ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.surveyNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.currentOwner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.registrationOffice?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRisk = 
        filterRisk === 'ALL' ||
        (filterRisk === 'VERIFIED' && !p.frozen && p.titleStatus === 'VERIFIED') ||
        (filterRisk === 'FLAGGED' && (p.frozen || p.titleStatus === 'DISPUTED' || p.titleStatus === 'REVIEW'));

      return matchSearch && matchRisk;
    });
  }, [allParcels, searchQuery, filterRisk]);

  const handleSelectParcel = (parcel) => {
    setSelectedParcel(parcel);
    const c = getParcelCentroid(parcel);
    if (viewMode === 'globe') {
      triggerFlyToLocation([c.lng, c.lat]);
    } else {
      setFlyCoords([c.lng, c.lat]);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070e1c] text-slate-100 flex flex-col font-sans select-none">
      
      {/* 1. Header Navigation Bar — Sits cleanly in flex flow so it NEVER overlaps child content */}
      <header className="h-16 flex-none px-4 sm:px-6 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl z-30 transition-colors shadow-lg">
        {/* Brand Seal */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center p-2 shadow-lg shadow-sky-500/30 text-white border border-white/20">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
              <path d="M16 4L4 10L16 16L28 10L16 4Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16L16 22L28 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 22L16 28L28 22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                TitleLock
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs">
                Cadastre 3D
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden md:block">
              National Land Records • Spatial Ledger
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Capsule */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-pill">
          <button
            type="button"
            onClick={() => setViewMode('globe')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'globe'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/35 border border-white/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Earth</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map3d')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'map3d'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/35 border border-white/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D City & Plots</span>
          </button>
        </div>

        {/* Action Portals */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => navigate('/citizen/login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Citizen Portal</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/registrar/login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white glass-button-glow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>Registrar</span>
          </button>
        </div>
      </header>

      {/* 2. Main Stage (flex-1 fills 100% of the viewport underneath header without any overlap) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Globe Mode */}
        {viewMode === 'globe' && (
          <div className="relative w-full h-full overflow-hidden bg-[#060c18]">
            {/* Background 3D Earth Canvas */}
            <ThreeGlobeBackground 
              onLocationClick={handleGlobeLocationClick}
              isZooming={isTransitioning}
              isDark={true}
            />

            {/* Left Premier Enterprise Hero & Search Capsule */}
            <div className="absolute top-6 left-6 sm:left-10 max-w-md w-full pointer-events-auto z-20">
              <div className="glass-panel-premium rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl border border-white/15">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold tracking-wider uppercase mb-2.5 border border-sky-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Government Spatial Cadastre</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Next-Gen Cadastral Ledger <br />
                    <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                      Built for Sovereign Trust
                    </span>
                  </h1>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                    Cryptographically immutable land registry mapped with precision photogrammetry. Search parcel records or click anywhere on Earth to explore 3D parcels.
                  </p>
                </div>

                {/* Instant Universal Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setViewMode('map3d');
                      }
                    }}
                    placeholder="Search ULPIN, Deed ID, Owner, Survey..."
                    className="w-full pl-10 pr-22 py-2.5 text-xs rounded-xl bg-slate-900/80 border border-white/15 text-white placeholder-slate-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setViewMode('map3d')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-[10px] font-bold text-sky-300 bg-sky-500/20 hover:bg-sky-500/35 rounded-lg border border-sky-400/30 cursor-pointer transition-all flex items-center gap-1"
                  >
                    <span>Lookup</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleEnableLocation}
                    disabled={locatingUser}
                    className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
                    <span>{locatingUser ? 'Acquiring GPS...' : 'Locate Device'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFlyToLocation([77.5148, 28.4633])}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md"
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Explore Deeds</span>
                  </button>
                </div>

                {locationMessage && (
                  <div className="text-[10px] font-mono text-sky-300 bg-sky-950/60 p-2.5 rounded-xl border border-sky-800/60 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 flex-none" />
                    <span>{locationMessage}</span>
                  </div>
                )}

                {/* Gesture hint & Interactive Controls */}
                <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Click anywhere on globe to dive</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">360° Drag • Scroll Zoom</span>
                </div>
              </div>
            </div>

            {/* Bottom Floating Sovereign Metrics HUD Bar */}
            <div className="absolute bottom-6 left-6 sm:left-10 z-20 pointer-events-auto">
              <div className="flex flex-wrap items-center gap-4 py-2.5 px-5 rounded-2xl glass-panel-premium text-xs text-slate-300 shadow-2xl">
                <div className="flex items-center gap-2.5 pr-4 border-r border-white/10">
                  <Database className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-bold text-white block">{allParcels.length} Verified Deeds</span>
                    <span className="text-[10px] text-slate-400">National Cadastre Database</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pr-4 border-r border-white/10">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold text-white block">SHA-256 Ledger</span>
                    <span className="text-[10px] text-slate-400">Zero-Tamper Chain</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-white block">3D Volumetric Extrusions</span>
                    <span className="text-[10px] text-slate-400">Real High-Res Imagery</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Right Live Registry Pulse Capsule */}
            <div className="absolute bottom-6 right-6 sm:right-10 z-20 pointer-events-auto hidden sm:block">
              <div className="flex items-center gap-2 py-2 px-3.5 rounded-xl glass-panel-premium text-[11px] text-slate-300 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-mono text-white">Registry Node #01</span>
                <span className="text-[10px] text-slate-400">• Online</span>
              </div>
            </div>
          </div>
        )}

        {/* 3D Real Map Mode */}
        {viewMode === 'map3d' && (
          <div className="relative w-full h-full">
            <Cadastral3DMap 
              parcels={filteredParcels}
              activeParcel={selectedParcel}
              onSelectParcel={handleSelectParcel}
              userLocation={userLocation}
              flyToCoords={flyCoords}
              targetZoom={17.5}
              className="w-full h-full"
            />

            {/* Left Filter & Search Drawer */}
            <div className="absolute top-4 left-4 z-20 w-80 sm:w-88 flex flex-col gap-2 pointer-events-auto">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ULPIN, owner, survey..."
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/20 text-white placeholder-slate-400 shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/15 text-[11px] shadow-sm">
                <button
                  type="button"
                  onClick={() => setFilterRisk('ALL')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterRisk === 'ALL'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({allParcels.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRisk('VERIFIED')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterRisk === 'VERIFIED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verified
                </button>
                <button
                  type="button"
                  onClick={() => setFilterRisk('FLAGGED')}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-all ${
                    filterRisk === 'FLAGGED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Review/Frozen
                </button>
              </div>

              {/* Relocate Pin */}
              <button
                type="button"
                onClick={handleEnableLocation}
                disabled={locatingUser}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-sky-500/30 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
                <span>{userLocation ? 'Re-center My GPS Location' : 'Locate My Device'}</span>
              </button>
            </div>

            {/* Selected Plot Detail Card */}
            {selectedParcel && (
              <div className="absolute top-4 right-4 z-20 w-80 sm:w-88 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 p-4 shadow-xl text-xs space-y-3 pointer-events-auto text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div>
                    <div className="font-mono font-bold text-sky-400">{selectedParcel.ulpin}</div>
                    <div className="text-[11px] text-slate-400">Survey #{selectedParcel.surveyNumber}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedParcel(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Owner</span>
                    <span className="font-semibold text-white truncate block">{selectedParcel.currentOwner}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Area</span>
                    <span className="font-semibold text-white">{selectedParcel.areaSqm?.toLocaleString()} m²</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Title Status</span>
                    <span className={`font-semibold ${selectedParcel.frozen ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selectedParcel.titleStatus || 'VERIFIED'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">Office</span>
                    <span className="font-semibold text-white truncate block">{selectedParcel.registrationOffice}</span>
                  </div>
                </div>

                {userLocation && (
                  <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/60 text-[11px] flex items-center justify-between text-sky-300 font-mono">
                    <span>Distance from you:</span>
                    <span className="font-bold">
                      {formatDistance(
                        calculateDistanceKm(
                          userLocation.lat,
                          userLocation.lng,
                          getParcelCentroid(selectedParcel).lat,
                          getParcelCentroid(selectedParcel).lng
                        )
                      )}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/citizen/login')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-sky-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Claim / View Registered Deed</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
