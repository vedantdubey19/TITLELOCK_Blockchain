import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { 
  ArrowLeft, 
  MapPin, 
  Layers, 
  Search, 
  ShieldCheck, 
  Compass, 
  Navigation, 
  ArrowUpDown, 
  LocateFixed,
  Building2,
  Maximize2,
  CheckCircle2,
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { CadastralLiveMap } from '../components/common/CadastralLiveMap';
import { 
  calculateDistanceKm, 
  formatDistance, 
  getParcelCentroid 
} from '../utils/cadastreUtils';

export function CitizenFullscreenMapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { allParcels } = useAuth();
  const { theme } = useTheme();

  // Pick initial parcel from state or default to first
  const initialParcelId = location.state?.selectedParcelId;
  const initialParcel = allParcels.find(p => p.id === initialParcelId) || allParcels[0] || null;

  const [selectedParcel, setSelectedParcel] = useState(initialParcel);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortByDistance, setSortByDistance] = useState(false);

  // User Device Geolocation state
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Request user device location
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
        setLocationError('Location permission denied');
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    detectUserLocation();
  }, []);

  // Geodesic distance calculation relative to user location (via cadastreUtils)

  // Enhance parcels with calculated distance
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

  // Filter & sort parcels
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

  // Selected parcel distance string
  const selectedDistanceStr = useMemo(() => {
    if (!selectedParcel || !userLocation) return null;
    const centroid = getParcelCentroid(selectedParcel);
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, centroid.lat, centroid.lng);
    return formatDistance(dist);
  }, [selectedParcel, userLocation]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none transition-colors duration-200">
      
      {/* TOP HEADER BAR (In standard flex flow so children below never overlap or underlap) */}
      <header className="flex-none h-16 w-full px-4 sm:px-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200/90 dark:border-white/10 flex items-center justify-between shadow-sm dark:shadow-2xl z-30 transition-colors duration-200 relative">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/citizen/map')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 active:scale-95 text-slate-800 dark:text-white text-xs font-semibold border border-slate-300/80 dark:border-white/15 transition-all cursor-pointer shadow-xs group"
            title="Return to Parcel Explorer"
          >
            <ArrowLeft className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Explorer</span>
          </button>

          <div className="h-6 w-px bg-slate-300 dark:bg-white/15 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>National Cadastral Map View</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  {allParcels.length} Registered Plots
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Full-screen GIS satellite canvas • WGS 84 Cadastral Mesh
            </p>
          </div>
        </div>

        {/* Right Header Status */}
        <div className="flex items-center gap-2.5">
          {userLocation ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-300 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-mono">
              <LocateFixed className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>GPS Connected ({userLocation.lat.toFixed(3)}°, {userLocation.lng.toFixed(3)}°)</span>
            </div>
          ) : (
            <button
              onClick={detectUserLocation}
              disabled={locatingUser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
              <span>{locatingUser ? 'Acquiring GPS...' : 'Acquire My GPS'}</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <ThemeToggle size="md" />

          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              sidebarOpen 
                ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300' 
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border-slate-300/80 dark:border-white/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{sidebarOpen ? 'Hide Plot List' : 'Show Plots'}</span>
          </button>
        </div>
      </header>

      {/* FULLSCREEN MAP VIEWPORT (flex-1 naturally fills the remainder of the screen below the header) */}
      <div className="flex-1 w-full relative overflow-hidden">
        <CadastralLiveMap
          parcels={allParcels}
          activeParcel={selectedParcel}
          onSelectParcel={(p) => setSelectedParcel(p)}
          height="100%"
          userLocation={userLocation}
          showToolbar={true}
          showParcelPill={false}
          showHud={false}
          showMapControls={true}
          controlsPosition="top-center"
        />

        {/* FLOATING SELECTED PLOT SUMMARY CARD AT TOP-LEFT */}
        {selectedParcel && (
          <div className="absolute top-4 left-4 z-20 max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 p-4 shadow-xl dark:shadow-2xl text-xs space-y-2 pointer-events-auto transition-colors">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  Boolean(selectedParcel.frozen) || selectedParcel.statusVariant === 'danger' ? 'bg-rose-500' :
                  selectedParcel.titleStatus === 'DISPUTED' ? 'bg-orange-500' :
                  selectedParcel.titleStatus === 'SUCCESSION_PENDING' ? 'bg-purple-500' :
                  selectedParcel.titleStatus === 'REVIEW' || selectedParcel.statusVariant === 'warning' ? 'bg-amber-400' :
                  'bg-emerald-400'
                }`} />
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{selectedParcel.id}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedParcel.statusVariant === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                selectedParcel.statusVariant === 'warning' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {selectedParcel.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">Owner</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedParcel.currentOwner}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Survey #</span>
                <span className="font-mono text-slate-900 dark:text-white">{selectedParcel.surveyNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Plot Area</span>
                <span className="text-slate-900 dark:text-white font-medium">{selectedParcel.areaSqm ? selectedParcel.areaSqm.toLocaleString() : '2,390'} m²</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Sub-Registrar</span>
                <span className="text-slate-900 dark:text-white truncate block">{selectedParcel.registrationOffice}</span>
              </div>
            </div>

            {selectedDistanceStr && (
              <div className="pt-1.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  Distance from you:
                </span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{selectedDistanceStr}</span>
              </div>
            )}
          </div>
        )}

        {/* COLLAPSIBLE RIGHT-SIDE PLOTS SIDEBAR */}
        {sidebarOpen && (
          <aside className="absolute top-4 right-4 bottom-4 z-20 w-80 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 shadow-xl dark:shadow-2xl p-4 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-200 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">All Cadastral Plots</h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{filtered.length} plots found</span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search and Sort */}
            <div className="py-2.5 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search plot ULPIN or owner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!userLocation) detectUserLocation();
                    setSortByDistance(!sortByDistance);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex-1 justify-center ${
                    sortByDistance && userLocation
                      ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>{sortByDistance && userLocation ? 'Sorted: Nearest' : 'Sort by Distance'}</span>
                </button>

                <button
                  type="button"
                  onClick={detectUserLocation}
                  disabled={locatingUser}
                  title="Refresh GPS"
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300/80 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Plots List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pt-1">
              {filtered.map((p) => {
                const isSelected = selectedParcel?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedParcel(p)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-500/20 border-sky-400 dark:border-sky-500 text-sky-950 dark:text-sky-200 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{p.id}</span>
                      <div className="flex items-center gap-1.5">
                        {p.distanceKm != null && (
                          <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 font-semibold bg-sky-50 dark:bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-200 dark:border-transparent">
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
                      <span className="truncate max-w-[140px]">{p.currentOwner}</span>
                      <span>{p.areaSqm ? p.areaSqm.toLocaleString() : '2,390'} m²</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>

    </div>
  );
}

export default CitizenFullscreenMapPage;
