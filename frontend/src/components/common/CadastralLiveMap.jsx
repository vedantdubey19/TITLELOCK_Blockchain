import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  Compass, 
  Layers, 
  Maximize2, 
  Crosshair, 
  Eye, 
  CheckCircle2, 
  Type, 
  Pencil, 
  MessageSquare, 
  ZoomIn, 
  ZoomOut,
  Sparkles,
  MapPin,
  ExternalLink,
  Navigation,
  LocateFixed,
  Route,
  Satellite
} from 'lucide-react';

// Free Tile providers (No API key required)
export const FREE_MAP_PROVIDERS = {
  esriSatellite: {
    id: 'esriSatellite',
    name: 'Real Aerial Satellite',
    sublabel: 'Esri World Imagery (High-Res)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    subdomains: []
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Streets',
    sublabel: 'Roads & Cadastral Boundaries',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c']
  }
};

import {
  calculateDistanceKm,
  formatDistance,
  getParcelCentroid,
  getParcelStatusColors
} from '../../utils/cadastreUtils';

// Re-export for any modules importing directly from CadastralLiveMap
export { calculateDistanceKm, formatDistance, getParcelCentroid, getParcelStatusColors };

/**
 * CadastralLiveMap
 * 100% Free Live Cadastral GIS & Real Satellite Imagery
 * Features:
 * - Real GPS land parcel boundary polygons
 * - Live User Device Geolocation with Distance Calculation
 * - Direct distance measuring between user's current location and parcel centroid
 * - Interactive 3D tilt perspective & layer switching
 */
export function CadastralLiveMap({
  parcels = [],
  activeParcel = null,
  onSelectParcel = null,
  height = '410px',
  className = '',
  showToolbar = true,
  showParcelPill = true,
  showHud = true,
  userLocation = null,
  onOpenLargerMap = null,
  showMapControls = true,
  controlsPosition = 'top-right'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const polygonLayersRef = useRef([]);
  const markerLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const distanceLineRef = useRef(null);

  const [activeProvider, setActiveProvider] = useState('esriSatellite');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [is3DTilt, setIs3DTilt] = useState(false);
  const [selectedTool, setSelectedTool] = useState('crosshair');
  const [measurementNotes, setMeasurementNotes] = useState(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  
  // Device Geolocation state
  const [currentDeviceLoc, setCurrentDeviceLoc] = useState(userLocation || null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Parse parcel coordinates (WGS 84 [lat, lng])
  const currentParcelLatLngs = useMemo(() => {
    if (activeParcel?.boundary && activeParcel.boundary.length > 0) {
      // In properties.json coordinates are stored as [lng, lat]. Leaflet expects [lat, lng].
      return activeParcel.boundary.map(([lng, lat]) => [lat, lng]);
    }
    // Default polygon for UP-0001 Greater Noida
    return [
      [28.46306, 77.51454],
      [28.46306, 77.51502],
      [28.46352, 77.51502],
      [28.46352, 77.51454]
    ];
  }, [activeParcel]);

  const centerLatLng = useMemo(() => {
    if (currentParcelLatLngs.length > 0) {
      const avgLat = currentParcelLatLngs.reduce((sum, p) => sum + p[0], 0) / currentParcelLatLngs.length;
      const avgLng = currentParcelLatLngs.reduce((sum, p) => sum + p[1], 0) / currentParcelLatLngs.length;
      return [avgLat, avgLng];
    }
    return [28.46329, 77.51478];
  }, [currentParcelLatLngs]);

  // Distance from user to active parcel
  const distanceFromUser = useMemo(() => {
    if (!currentDeviceLoc) return null;
    return calculateDistanceKm(
      currentDeviceLoc.lat,
      currentDeviceLoc.lng,
      centerLatLng[0],
      centerLatLng[1]
    );
  }, [currentDeviceLoc, centerLatLng]);

  // Auto-request device location on component mount
  useEffect(() => {
    if (navigator.geolocation && !currentDeviceLoc) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentDeviceLoc({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          console.warn('Geolocation access:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove old instance if container was previously initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const provider = FREE_MAP_PROVIDERS[activeProvider] || FREE_MAP_PROVIDERS.esriSatellite;

    const map = L.map(mapContainerRef.current, {
      center: centerLatLng,
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
      maxZoom: provider.maxZoom,
      scrollWheelZoom: true,
      fadeAnimation: true
    });

    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      maxNativeZoom: provider.maxNativeZoom || 18,
      subdomains: provider.subdomains || ['a', 'b', 'c'],
      crossOrigin: 'anonymous',
      errorTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Trigger map size recalculation multiple times to ensure full tile rendering without blank gray spots
    const resizeTimer1 = setTimeout(() => { if (map) map.invalidateSize(); }, 150);
    const resizeTimer2 = setTimeout(() => { if (map) map.invalidateSize(); }, 500);
    const resizeTimer3 = setTimeout(() => { if (map) map.invalidateSize(); }, 1200);

    const handleWindowResize = () => {
      if (map) map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(resizeTimer1);
      clearTimeout(resizeTimer2);
      clearTimeout(resizeTimer3);
      window.removeEventListener('resize', handleWindowResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Update base tile layer on provider change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const provider = FREE_MAP_PROVIDERS[activeProvider] || FREE_MAP_PROVIDERS.esriSatellite;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      maxNativeZoom: provider.maxNativeZoom || 18,
      subdomains: provider.subdomains || ['a', 'b', 'c'],
      crossOrigin: 'anonymous',
      errorTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
    setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 100);
  }, [activeProvider]);

  // Update active parcel polygon, neighboring plots, and user device pin
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Smooth pan to active parcel center
    map.flyTo(centerLatLng, map.getZoom() < 17 ? 17.5 : map.getZoom(), {
      duration: 0.6,
      easeLinearity: 0.25
    });

    // Clear existing polygon layers
    polygonLayersRef.current.forEach(layer => map.removeLayer(layer));
    polygonLayersRef.current = [];
    if (markerLayerRef.current) {
      map.removeLayer(markerLayerRef.current);
      markerLayerRef.current = null;
    }

    const activeColors = getParcelStatusColors(activeParcel);

    // Elevation height offset in degrees (~6-9 meters physical elevation in GPS space)
    const ELEVATION_LAT = 0.000050;
    const ELEVATION_LNG = -0.000042;

    // 1. Draw Active Parcel 3D Extrusion
    if (currentParcelLatLngs.length > 2) {
      const activeRoofLatLngs = currentParcelLatLngs.map(([lat, lng]) => [lat + ELEVATION_LAT, lng + ELEVATION_LNG]);
      const activeShadowLatLngs = currentParcelLatLngs.map(([lat, lng]) => [lat - 0.000035, lng + 0.000035]);

      // Active Ground Shadow
      const activeShadow = L.polygon(activeShadowLatLngs, {
        color: 'transparent',
        fillColor: '#000000',
        fillOpacity: 0.55,
        interactive: false
      }).addTo(map);
      polygonLayersRef.current.push(activeShadow);

      // Active 3D Walls
      for (let i = 0; i < currentParcelLatLngs.length; i++) {
        const next = (i + 1) % currentParcelLatLngs.length;
        const wallQuad = [
          currentParcelLatLngs[i],
          currentParcelLatLngs[next],
          activeRoofLatLngs[next],
          activeRoofLatLngs[i]
        ];
        const wall = L.polygon(wallQuad, {
          color: '#38bdf8',
          weight: 1,
          fillColor: '#0284c7',
          fillOpacity: 0.8,
          interactive: false
        }).addTo(map);
        polygonLayersRef.current.push(wall);
      }

      // Active Roof Slab
      const activePolygon = L.polygon(activeRoofLatLngs, {
        color: '#ffffff',
        weight: 3.5,
        opacity: 1,
        fillColor: activeColors.fill,
        fillOpacity: 0.7,
        className: 'cadastre-active-polygon'
      }).addTo(map);

      activePolygon.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px;">
           <div style="font-weight: 700; color: #0284c7;">${activeParcel?.id || 'UP-0001'}</div>
           <div>${activeParcel?.currentOwner || 'Certified Titleholder'}</div>
           <div style="color: #64748b; font-size: 10px;">
             ${activeParcel?.areaSqm ? activeParcel.areaSqm.toLocaleString() : '2,390'} m² • <span style="font-weight:600; color:${activeColors.stroke}">${activeParcel?.status || 'VERIFIED'}</span>
           </div>
         </div>`,
        { permanent: false, direction: 'top', className: 'cadastre-tooltip' }
      );

      polygonLayersRef.current.push(activePolygon);

      // Add center glowing 3D pin marker with matching status color
      const centerCircle = L.circleMarker([centerLatLng[0] + ELEVATION_LAT, centerLatLng[1] + ELEVATION_LNG], {
        radius: 6,
        color: '#ffffff',
        weight: 2.5,
        fillColor: activeColors.stroke,
        fillOpacity: 1
      }).addTo(map);

      markerLayerRef.current = centerCircle;
    }

    // 2. Render Neighboring parcels from registry with 3D volumetric extrusion
    if (parcels && parcels.length > 0) {
      parcels.forEach((p) => {
        if (p.id === activeParcel?.id || !p.boundary || p.boundary.length < 3) return;
        const groundLatLngs = p.boundary.map(([lng, lat]) => [lat, lng]);
        const roofLatLngs = groundLatLngs.map(([lat, lng]) => [lat + ELEVATION_LAT, lng + ELEVATION_LNG]);
        const pColors = getParcelStatusColors(p);

        // Ground shadow
        const shadowPoly = L.polygon(
          groundLatLngs.map(([lat, lng]) => [lat - 0.000030, lng + 0.000030]),
          { color: 'transparent', fillColor: '#000000', fillOpacity: 0.32, interactive: false }
        ).addTo(map);
        polygonLayersRef.current.push(shadowPoly);

        // 3D Extruded Walls
        const wallBase = p.frozen ? '#dc2626' : (p.titleStatus === 'DISPUTED' ? '#d97706' : '#059669');
        for (let i = 0; i < groundLatLngs.length; i++) {
          const next = (i + 1) % groundLatLngs.length;
          const wallQuad = [
            groundLatLngs[i],
            groundLatLngs[next],
            roofLatLngs[next],
            roofLatLngs[i]
          ];
          const wall = L.polygon(wallQuad, {
            color: 'rgba(0,0,0,0.3)',
            weight: 1,
            fillColor: wallBase,
            fillOpacity: 0.55,
            interactive: false
          }).addTo(map);
          polygonLayersRef.current.push(wall);
        }

        // Roof Slab
        const poly = L.polygon(roofLatLngs, {
          color: p.frozen ? '#fca5a5' : (p.titleStatus === 'DISPUTED' ? '#fde68a' : '#a7f3d0'),
          weight: 1.8,
          opacity: 0.95,
          fillColor: pColors.fill,
          fillOpacity: 0.48,
          className: 'cadastre-plot-polygon'
        }).addTo(map);

        poly.bindTooltip(
          `<div style="font-family: inherit; font-size: 11px;">
             <div style="font-weight: 700; color: #0284c7;">${p.id}</div>
             <div>${p.currentOwner || 'Registered Titleholder'}</div>
             <div style="color: #64748b; font-size: 10px;">
               ${p.areaSqm?.toLocaleString()} m² • <span style="font-weight:600; color:${pColors.stroke}">${p.titleStatus || p.status || 'VERIFIED'}</span>
             </div>
           </div>`,
          { permanent: false, direction: 'center', className: 'cadastre-tooltip' }
        );

        poly.on('click', () => {
          if (onSelectParcel) onSelectParcel(p);
        });

        polygonLayersRef.current.push(poly);
      });
    }

    // 3. Render User Device Location & Connecting Distance Polyline
    if (currentDeviceLoc) {
      if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
      if (distanceLineRef.current) map.removeLayer(distanceLineRef.current);

      // User location pulse circle
      const userMarker = L.circleMarker([currentDeviceLoc.lat, currentDeviceLoc.lng], {
        radius: 7,
        color: '#ffffff',
        weight: 2.5,
        fillColor: '#3b82f6',
        fillOpacity: 1
      }).addTo(map);

      userMarker.bindTooltip(
        `<strong>Your Current Device Location</strong><br/>Lat: ${currentDeviceLoc.lat.toFixed(4)}°, Lng: ${currentDeviceLoc.lng.toFixed(4)}°`,
        { permanent: false, direction: 'bottom' }
      );
      userMarkerRef.current = userMarker;

      // Connecting dashline between user location and parcel centroid
      const distLine = L.polyline([
        [currentDeviceLoc.lat, currentDeviceLoc.lng],
        centerLatLng
      ], {
        color: '#60a5fa',
        weight: 2,
        opacity: 0.75,
        dashArray: '6, 8'
      }).addTo(map);

      distLine.bindTooltip(
        `<strong>Distance:</strong> ${formatDistance(distanceFromUser)}`,
        { permanent: false, direction: 'center' }
      );
      distanceLineRef.current = distLine;
    }
  }, [activeParcel, currentParcelLatLngs, centerLatLng, parcels, currentDeviceLoc, distanceFromUser, onSelectParcel]);

  // Request high-accuracy live GPS location and fly directly to device location
  const handleLocateMe = () => {
    // If device location is already known, smoothly fly directly to user's device coordinates
    if (currentDeviceLoc && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentDeviceLoc.lat, currentDeviceLoc.lng], 18, {
        duration: 0.8,
        easeLinearity: 0.25
      });
      const dist = calculateDistanceKm(currentDeviceLoc.lat, currentDeviceLoc.lng, centerLatLng[0], centerLatLng[1]);
      setMeasurementNotes(`Centered on your GPS location (${currentDeviceLoc.lat.toFixed(4)}°, ${currentDeviceLoc.lng.toFixed(4)}°) • ${formatDistance(dist)} to ${activeParcel?.id || 'plot'}`);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setLocatingUser(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        setCurrentDeviceLoc(loc);

        // Fly directly to user's device coordinates
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([loc.lat, loc.lng], 18, {
            duration: 0.8,
            easeLinearity: 0.25
          });
        }

        const dist = calculateDistanceKm(loc.lat, loc.lng, centerLatLng[0], centerLatLng[1]);
        setMeasurementNotes(`Centered on your location (${loc.lat.toFixed(4)}°, ${loc.lng.toFixed(4)}°) • ${formatDistance(dist)} to ${activeParcel?.id || 'plot'}`);
      },
      (err) => {
        setLocatingUser(false);
        setGeoError(err.message || 'Unable to access your device location');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleZoom = (delta) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
  };

  const handleRecenter = () => {
    setSelectedTool('crosshair');
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(centerLatLng, 18, { duration: 0.5 });
  };

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] w-full bg-slate-950 group select-none ${className}`} 
      style={{ height }}
    >
      {/* 3D Tilt CSS Wrapper */}
      <div 
        className={`w-full h-full transition-transform duration-500 ease-out origin-bottom ${
          is3DTilt ? 'scale-[1.03]' : ''
        }`}
        style={is3DTilt ? { transform: 'rotateX(20deg) scale(1.04)' } : undefined}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* TOP HUD BAR: Real Location & Distance Badges */}
      {showHud && (
        <div className="absolute top-3 left-3 right-14 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono shadow-lg">
            <Compass className="w-3.5 h-3.5 text-orange-400 animate-spin duration-3000" />
            <span className="font-bold">
              {centerLatLng[0].toFixed(5)}°N, {centerLatLng[1].toFixed(5)}°E
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="hidden sm:inline text-emerald-400 font-semibold">
              WGS 84 • {is3DTilt ? '3D Oblique' : '2D Nadir'}
            </span>
          </div>

          {/* Distance From Current Device User Pill */}
          {distanceFromUser != null && (
            <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-950/90 backdrop-blur-md border border-blue-500/40 text-blue-200 text-[11px] font-semibold shadow-lg">
              <Route className="w-3.5 h-3.5 text-blue-400" />
              <span>From You: <strong>{formatDistance(distanceFromUser)}</strong></span>
            </div>
          )}

          <div className="pointer-events-auto hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Real Satellite Live (Free)</span>
          </div>
        </div>
      )}

      {/* MAP CONTROLS: Top-Center Layout (when in Fullpage View) OR Top-Right Layout */}
      {showMapControls && controlsPosition === 'top-center' ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 shadow-xl pointer-events-auto">
          {/* GPS Locate Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            title={currentDeviceLoc ? `Your Location: ${formatDistance(distanceFromUser)} away` : 'Find My Device Location'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
              currentDeviceLoc
                ? 'bg-blue-600 text-white shadow-blue-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Layer Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(prev => !prev)}
              title="Switch Map Layer"
              className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                showLayerMenu ? 'bg-sky-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
            </button>

            {showLayerMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 top-11 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-2xl p-2 z-[60] text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono border-b border-slate-100 dark:border-white/5 pb-1.5">
                  <span>Map Layer</span>
                  <span className="text-emerald-500 font-normal">Active Cadastre</span>
                </div>
                {Object.values(FREE_MAP_PROVIDERS).map((p) => {
                  const isSelected = activeProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActiveProvider(p.id);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 font-semibold border border-sky-500/30 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{p.sublabel}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-white/20 mx-0.5" />

          {/* 3D Perspective Toggle */}
          <button
            type="button"
            onClick={() => {
              setIs3DTilt(prev => !prev);
              setTimeout(() => {
                if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
              }, 100);
            }}
            title={is3DTilt ? 'Switch to 2D Top-Down View' : 'Switch to 3D Oblique Perspective'}
            className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 text-xs font-bold ${
              is3DTilt 
                ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
          >
            <span className="text-[10px] font-mono font-extrabold">3D</span>
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => handleZoom(1)}
            title="Zoom In"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer transition-all active:scale-95"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            title="Zoom Out"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer transition-all active:scale-95"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {onOpenLargerMap && (
            <>
              <div className="w-px h-5 bg-white/20 mx-0.5" />
              <button
                type="button"
                onClick={onOpenLargerMap}
                title="Open Fullscreen Cadastral Map"
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      ) : showMapControls ? (
        <>
          {/* TOP RIGHT BUTTONS: My Location GPS Trigger, Layer Selector & Fullscreen */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {/* Device GPS Locator Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              title={currentDeviceLoc ? `Your Location: ${formatDistance(distanceFromUser)} away` : 'Find My Device Location'}
              className={`w-8 h-8 rounded-2xl shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border ${
                currentDeviceLoc
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/30'
                  : 'bg-white/90 hover:bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-white/60 dark:border-white/10'
              }`}
            >
              <LocateFixed className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Layer Selector Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLayerMenu(prev => !prev)}
                title="Switch Map Layer"
                className="w-8 h-8 rounded-2xl bg-white/95 hover:bg-white dark:bg-slate-800/95 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-white/60 dark:border-white/10"
              >
                <Layers className="w-3.5 h-3.5 text-sky-500" />
              </button>

              {/* Layer Menu Popover */}
              {showLayerMenu && (
                <div className="absolute right-0 top-10 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-2xl p-2 z-[60] text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono border-b border-slate-100 dark:border-white/5 pb-1.5">
                    <span>Map Layer</span>
                    <span className="text-emerald-500 font-normal">Active Cadastre</span>
                  </div>
                  {Object.values(FREE_MAP_PROVIDERS).map((p) => {
                    const isSelected = activeProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActiveProvider(p.id);
                          setShowLayerMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 font-semibold border border-sky-500/30 shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs">{p.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{p.sublabel}</span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {onOpenLargerMap && (
              <button
                type="button"
                onClick={onOpenLargerMap}
                title="Open Fullscreen Cadastral Map"
                className="w-8 h-8 rounded-2xl bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-white/60 dark:border-white/10"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* FLOATING ZOOM & 3D TILT BUTTONS (Right Side) */}
          <div className="absolute right-3 top-14 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIs3DTilt(prev => !prev);
                setTimeout(() => {
                  if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
                }, 100);
              }}
              title={is3DTilt ? 'Switch to 2D Top-Down View' : 'Switch to 3D Oblique Perspective'}
              className={`w-8 h-8 rounded-2xl backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border text-xs font-bold ${
                is3DTilt 
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20' 
                  : 'bg-black/80 hover:bg-black text-slate-200 border-white/20'
              }`}
            >
              <span className="text-[10px] font-mono font-extrabold">3D</span>
            </button>

            <button
              type="button"
              onClick={() => handleZoom(1)}
              title="Zoom In"
              className="w-8 h-8 rounded-2xl bg-black/80 hover:bg-black backdrop-blur-md text-slate-200 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-white/20"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleZoom(-1)}
              title="Zoom Out"
              className="w-8 h-8 rounded-2xl bg-black/80 hover:bg-black backdrop-blur-md text-slate-200 shadow-md flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-white/20"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : null}

      {/* BOTTOM LEFT PARCEL PILL (Matches user reference screenshot: • UP-0001 (2,390 m²)) */}
      {showParcelPill && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-xl">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              Boolean(activeParcel?.frozen) || activeParcel?.statusVariant === 'danger' ? 'bg-rose-500' :
              activeParcel?.titleStatus === 'DISPUTED' ? 'bg-orange-500' :
              activeParcel?.titleStatus === 'SUCCESSION_PENDING' ? 'bg-purple-500' :
              activeParcel?.titleStatus === 'REVIEW' || activeParcel?.statusVariant === 'warning' ? 'bg-amber-400' :
              'bg-emerald-400'
            }`} />
            <span className="font-mono font-bold tracking-tight">
              {activeParcel?.id || 'UP-0001-CLEAN'}
            </span>
            <span className="text-slate-300 font-normal">
              ({activeParcel?.areaSqm ? activeParcel.areaSqm.toLocaleString() : '2,390'} m²)
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ml-1 ${
              Boolean(activeParcel?.frozen) || activeParcel?.statusVariant === 'danger' ? 'bg-rose-500/30 text-rose-300' :
              activeParcel?.titleStatus === 'DISPUTED' ? 'bg-orange-500/30 text-orange-300' :
              activeParcel?.titleStatus === 'SUCCESSION_PENDING' ? 'bg-purple-500/30 text-purple-300' :
              activeParcel?.titleStatus === 'REVIEW' || activeParcel?.statusVariant === 'warning' ? 'bg-amber-500/30 text-amber-300' :
              'bg-emerald-500/30 text-emerald-300'
            }`}>
              {activeParcel?.status || 'VERIFIED'}
            </span>
          </div>
        </div>
      )}

      {/* FLOATING TOOLBAR PILL AT BOTTOM-CENTER (Matches user reference screenshot) */}
      {showToolbar && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full px-4 py-1.5 bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center gap-4 shadow-xl text-xs">
          <button 
            type="button"
            onClick={handleRecenter}
            className={`p-1 rounded-full transition-colors cursor-pointer ${selectedTool === 'crosshair' ? 'text-emerald-400 scale-110' : 'text-slate-300 hover:text-white'}`}
            title="Center parcel viewport"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setSelectedTool('type');
              // Switch between satellite & OpenStreetMap streets
              setActiveProvider(prev => prev === 'esriSatellite' ? 'osm' : 'esriSatellite');
            }}
            className={`p-1 rounded-full transition-colors cursor-pointer ${activeProvider === 'osm' ? 'text-emerald-400 scale-110' : 'text-slate-300 hover:text-white'}`}
            title="Toggle between Satellite Imagery and Street Cadastre labels"
          >
            <Type className="w-4 h-4" />
          </button>

          <button 
            type="button"
            onClick={() => {
              setSelectedTool('edit');
              setIsMeasuring(prev => !prev);
              setMeasurementNotes(isMeasuring ? null : `Perimeter: ~${Math.round(Math.sqrt(activeParcel?.areaSqm || 2390) * 4)}m • Area: ${activeParcel?.areaSqm || 2390} m²`);
            }}
            className={`p-1 rounded-full transition-colors cursor-pointer ${isMeasuring ? 'text-emerald-400 scale-110' : 'text-slate-300 hover:text-white'}`}
            title="Measure parcel boundary"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button"
            onClick={() => {
              setSelectedTool('message');
              setMeasurementNotes(prev => prev ? null : `Sub-Registrar: ${activeParcel?.registrationOffice || 'Greater Noida'} • Survey: ${activeParcel?.surveyNumber || 'SN-712-B'} • Distance: ${formatDistance(distanceFromUser)}`);
            }}
            className={`p-1 rounded-full transition-colors cursor-pointer ${selectedTool === 'message' && measurementNotes ? 'text-emerald-400 scale-110' : 'text-slate-300 hover:text-white'}`}
            title="View cadastre survey notes and distance"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Measurement / Survey note pill */}
      {measurementNotes && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md text-emerald-300 border border-emerald-500/40 text-[11px] font-mono shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {measurementNotes}
        </div>
      )}

      {/* Geolocation error notification */}
      {geoError && (
        <div className="absolute top-14 left-3 z-20 px-3 py-1 rounded-xl bg-rose-950/90 text-rose-300 border border-rose-500/40 text-[11px] font-sans shadow-lg">
          {geoError}
        </div>
      )}

      {/* Bottom Right Free Map Attribution badge */}
      <div className="absolute bottom-1 right-2 z-10 text-[9px] text-white/50 font-sans pointer-events-none">
        Esri & OSM Cadastre • Free API
      </div>
    </div>
  );
}

export default CadastralLiveMap;
