import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Compass, 
  Maximize2, 
  Database,
  Key,
  Navigation,
  ArrowUpDown,
  LocateFixed
} from 'lucide-react';
import { CadastralLiveMap } from '../components/common/CadastralLiveMap';
import {
  calculateDistanceKm,
  formatDistance,
  getParcelCentroid,
  getParcelStatusColors
} from '../utils/cadastreUtils';

/**
 * ============================================================================
 * CitizenPublicMapPage
 * ============================================================================
 * Cadastral Land Map Explorer page for citizens.
 * Integrates live satellite imagery, cadastral vector polygons, user GPS proximity,
 * and property search/filtering.
 */
export function CitizenPublicMapPage() {
  const navigate = useNavigate();
  const { allParcels } = useAuth();
  const [selectedParcel, setSelectedParcel] = useState(allParcels[0] || null);
  const [search, setSearch] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);
  
  // --------------------------------------------------------------------------
  // User Device Geolocation Management
  // --------------------------------------------------------------------------
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const detectUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocatingUser(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationError('Location permission denied or unavailable');
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    detectUserLocation();
  }, []);

  // --------------------------------------------------------------------------
  // Geospatial Data Computations (Proximity & Centroid Mapping)
  // --------------------------------------------------------------------------
  const parcelsWithDistance = useMemo(() => {
    return allParcels.map((p) => {
      let distanceKm = null;
      if (userLocation) {
        const centroid = getParcelCentroid(p);
        distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, centroid.lat, centroid.lng);
      }
      return {
        ...p,
        distanceKm
      };
    });
  }, [allParcels, userLocation]);

  // Filter & Sort parcels list
  const filtered = useMemo(() => {
    let list = parcelsWithDistance.filter(
      (p) =>
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.currentOwner?.toLowerCase().includes(search.toLowerCase()) ||
        p.surveyNumber?.toLowerCase().includes(search.toLowerCase())
    );

    if (sortByDistance && userLocation) {
      list = [...list].sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return list;
  }, [parcelsWithDistance, search, sortByDistance, userLocation]);

  // Selected parcel distance display text
  const selectedDistanceStr = useMemo(() => {
    if (!selectedParcel || !userLocation) return null;
    const centroid = getParcelCentroid(selectedParcel);
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, centroid.lat, centroid.lng);
    return formatDistance(dist);
  }, [selectedParcel, userLocation]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              100% Free Satellite Cadastre Active • No API Key Needed
            </span>
            {userLocation && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1 font-medium">
                <LocateFixed className="w-2.5 h-2.5" />
                Live GPS Connected ({userLocation.lat.toFixed(3)}°, {userLocation.lng.toFixed(3)}°)
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            3D Cadastral Land Map Explorer ({allParcels.length} Polygons)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real satellite imagery with exact cadastral polygon boundaries, live GPS location detection, and distance measurement.
          </p>
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Cadastre Explorer Viewport */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          <CadastralLiveMap
            parcels={allParcels}
            activeParcel={selectedParcel}
            onSelectParcel={(p) => setSelectedParcel(p)}
            height="560px"
            userLocation={userLocation}
            onOpenLargerMap={() => navigate('/citizen/map/fullscreen', { state: { selectedParcelId: selectedParcel?.id } })}
          />

          {/* Distance Info Banner */}
          {selectedParcel && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{selectedParcel.id}</span>
                    <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                      Survey #{selectedParcel.surveyNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedParcel.registrationOffice} • {selectedParcel.areaSqm ? selectedParcel.areaSqm.toLocaleString() : '2,390'} m²
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedDistanceStr ? (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Distance from you</span>
                    <div className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
                      {selectedDistanceStr}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={detectUserLocation}
                    disabled={locatingUser}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-medium hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all cursor-pointer"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
                    <span>{locatingUser ? 'Locating...' : 'Enable GPS Distance'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col max-h-[620px]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cadastral Plot Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse all {allParcels.length} geocoded parcels
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by ULPIN, owner, survey..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Sort & Geo controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!userLocation) {
                    detectUserLocation();
                  }
                  setSortByDistance(!sortByDistance);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  sortByDistance && userLocation
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{sortByDistance && userLocation ? 'Sorted by Nearest' : 'Sort by Distance'}</span>
              </button>

              <button
                type="button"
                onClick={detectUserLocation}
                disabled={locatingUser}
                title="Refresh current location"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {locationError && (
              <p className="text-[10px] text-rose-500">{locationError}</p>
            )}
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
            {filtered.slice(0, 30).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedParcel(p)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedParcel?.id === p.id
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs'
                    : 'bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{p.id}</span>
                  <div className="flex items-center gap-1.5">
                    {p.distanceKm != null && (
                      <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded">
                        {p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)}m` : `${p.distanceKm.toFixed(1)}km`}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      p.statusVariant === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' :
                      p.statusVariant === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400' :
                      'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>Owner: {p.currentOwner}</span>
                  <span>{p.areaSqm ? p.areaSqm.toLocaleString() : '2,390'} m²</span>
                </div>
              </button>
            ))}
          </div>

          {selectedParcel && (
            <div className="p-3 bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Active Geometry</span>
                {selectedDistanceStr && (
                  <span className="text-sky-600 dark:text-sky-400 font-mono text-[11px] font-medium">
                    {selectedDistanceStr}
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] leading-relaxed">
                Boundary: {selectedParcel?.boundary?.length || 4} Geo-Vertices<br/>
                Office: {selectedParcel.registrationOffice || 'Greater Noida Sub-Registrar'}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default CitizenPublicMapPage;
