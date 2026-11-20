import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Compass, 
  Mountain, 
  Plus, 
  Minus, 
  LocateFixed, 
  Maximize2,
  Layers,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ChevronRight,
  Shield
} from 'lucide-react';
import { getParcelCentroid } from '../../utils/cadastreUtils';

/**
 * 100% Free, Keyless, Reliable Tile Providers
 * Primary: High-Detail Cadastre Streets (Native zoom up to 20 without pixelation or blurriness).
 * Satellite: Esri World Imagery (High-Res 3D aerial, native zoom 19).
 */
const BASE_MAP_STYLES = {
  osmStreets: {
    id: 'osmStreets',
    name: 'Cadastre Streets & Parks (Ultra HD)',
    sublabel: 'Crisp High-Zoom Roads, Parks & Infrastructure',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
            'https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
            'https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 20,
          attribution: '&copy; OpenStreetMap contributors, CyclOSM'
        }
      },
      layers: [
        {
          id: 'osm-base-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-resampling': 'linear',
            'raster-fade-duration': 0
          }
        }
      ]
    }
  },
  esriSatellite: {
    id: 'esriSatellite',
    name: 'Real Aerial Satellite',
    sublabel: 'High-Res Aerial Satellite Imagery',
    style: {
      version: 8,
      sources: {
        'esri-sat-tiles': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; Esri World Imagery'
        }
      },
      layers: [
        {
          id: 'esri-sat-layer',
          type: 'raster',
          source: 'esri-sat-tiles',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-resampling': 'linear',
            'raster-fade-duration': 0
          }
        }
      ]
    }
  },
  osmStandard: {
    id: 'osmStandard',
    name: 'OpenStreetMap Standard',
    sublabel: 'Classic OSM Street Grid',
    style: {
      version: 8,
      sources: {
        'osm-std-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.de/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.de/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.de/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 18,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-std-layer',
          type: 'raster',
          source: 'osm-std-tiles',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-resampling': 'linear',
            'raster-fade-duration': 0
          }
        }
      ]
    }
  }
};

/**
 * Status color resolver matching reference UI exactly:
 * - Green (#10b981): Verified / Clean Title
 * - Orange/Amber (#f59e0b): Review / Caution
 * - Red (#ef4444): High Risk / Disputed
 * - Slate (#475569): Frozen / Injunction
 * - Blue (#3b82f6): Succession Pending
 */
function getStatusTheme(p) {
  const status = (p.title_status || p.titleStatus || '').toUpperCase();
  const risk = (p.risk_status || p.riskStatus || '').toUpperCase();
  const isFrozen = Boolean(p.frozen) || status === 'FROZEN';
  const isDisputed = status === 'DISPUTED' || (Array.isArray(p.disputes) && p.disputes.length > 0);
  const isSuccession = status === 'SUCCESSION_PENDING' || status.includes('SUCCESSION');
  const isReview = status === 'REVIEW' || 
                   status === 'VERIFIED_WITH_ENCUMBRANCE' || 
                   risk === 'REVIEW' || 
                   risk === 'MODERATE_RISK' ||
                   (Array.isArray(p.encumbrances) && p.encumbrances.length > 0);

  if (isFrozen) {
    return {
      color: '#475569',
      wallColor: '#334155',
      roofBorder: '#94a3b8',
      label: 'Frozen / Injunction',
      icon: 'lock',
      badgeClass: 'text-slate-300 bg-slate-800'
    };
  }

  if (isDisputed || risk === 'HIGH_RISK') {
    return {
      color: '#ef4444',
      wallColor: '#b91c1c',
      roofBorder: '#fca5a5',
      label: 'High Risk / Disputed',
      icon: 'alert',
      badgeClass: 'text-rose-400 bg-rose-950/60'
    };
  }

  if (isSuccession) {
    return {
      color: '#3b82f6',
      wallColor: '#1d4ed8',
      roofBorder: '#93c5fd',
      label: 'Succession Pending',
      icon: 'clock',
      badgeClass: 'text-blue-400 bg-blue-950/60'
    };
  }

  if (isReview) {
    return {
      color: '#f59e0b',
      wallColor: '#b45309',
      roofBorder: '#fde68a',
      label: 'Under Review / Caution',
      icon: 'clock',
      badgeClass: 'text-amber-400 bg-amber-950/60'
    };
  }

  return {
    color: '#10b981',
    wallColor: '#047857',
    roofBorder: '#a7f3d0',
    label: 'Verified / Clean Title',
    icon: 'check',
    badgeClass: 'text-emerald-400 bg-emerald-950/60'
  };
}

// Generate rich DOM marker for user location with high-contrast animated blue pulse
function createUserLocationElement() {
  const el = document.createElement('div');
  el.className = 'live-user-gps-pulse-beacon';
  el.style.position = 'relative';
  el.style.width = '48px';
  el.style.height = '48px';
  el.style.cursor = 'pointer';
  el.style.zIndex = '999999';

  el.innerHTML = `
    <div style="
      position: absolute;
      inset: 0px;
      border-radius: 9999px;
      background: rgba(14, 165, 233, 0.45);
      animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
    "></div>
    <div style="
      position: absolute;
      inset: 6px;
      border-radius: 9999px;
      background: rgba(2, 132, 199, 0.35);
      border: 2px solid rgba(56, 189, 248, 0.6);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    "></div>
    <div style="
      position: absolute;
      inset: 12px;
      border-radius: 9999px;
      background: #0284c7;
      border: 3.5px solid #ffffff;
      box-shadow: 0 0 16px rgba(14, 165, 233, 0.9), 0 4px 10px rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 6px; height: 6px; border-radius: 9999px; background: #ffffff;"></div>
    </div>
    <div style="
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      background: #0d1527;
      color: #38bdf8;
      font-size: 10px;
      font-weight: 700;
      font-family: ui-sans-serif, system-ui;
      padding: 1px 6px;
      border-radius: 9999px;
      border: 1px solid rgba(56, 189, 248, 0.4);
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      pointer-events: none;
    ">
      YOU ARE HERE
    </div>
  `;
  return el;
}

export function Cadastral3DMap({
  parcels = [],
  activeParcel = null,
  onSelectParcel = null,
  userLocation = null,
  flyToCoords = null,
  targetZoom = 15.5,
  is3DTilt = true,
  onToggleTilt = null,
  className = '',
  showControls = true
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const parcelMarkersRef = useRef([]);

  // States
  const [is3DMode, setIs3DMode] = useState(is3DTilt);
  const [activeStyleKey, setActiveStyleKey] = useState('osmStreets');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentBearing, setCurrentBearing] = useState(-15);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState('');

  // Sync external tilt
  useEffect(() => {
    setIs3DMode(is3DTilt);
  }, [is3DTilt]);

  // Convert parcels into valid GeoJSON FeatureCollection
  const parcelsGeoJson = useMemo(() => {
    const features = parcels.map((p) => {
      let coords = [];
      if (Array.isArray(p.boundary) && p.boundary.length >= 3) {
        coords = p.boundary.map(pt => [Number(pt[0]), Number(pt[1])]);
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([first[0], first[1]]);
        }
      }

      const area = Number(p.area_sqm || p.areaSqm) || 1500;
      // Elegant architectural building box heights: 25m - 90m
      const extrusionHeight = Math.min(Math.max(Math.sqrt(area) * 2.2, 22), 95);
      const theme = getStatusTheme(p);
      const isSelected = Boolean(activeParcel && (
        (activeParcel.ulpin && activeParcel.ulpin === p.ulpin) ||
        (activeParcel.id && activeParcel.id === p.id)
      ));

      return {
        type: 'Feature',
        id: p.ulpin || p.id,
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {
          ulpin: p.ulpin || p.id,
          surveyNumber: p.survey_number || p.surveyNumber || 'SN-CADASTRE',
          currentOwner: p.current_owner || p.currentOwner || 'Certified Titleholder',
          areaSqm: area,
          titleStatus: p.title_status || p.titleStatus || 'VERIFIED',
          statusLabel: theme.label,
          color: isSelected ? '#0ea5e9' : theme.color,
          roofBorder: isSelected ? '#ffffff' : theme.roofBorder,
          height: is3DMode ? extrusionHeight : 1,
          isSelected: isSelected,
          tag: (p.survey_number || p.surveyNumber || p.ulpin || '').replace('SN-', '')
        }
      };
    }).filter(f => f.geometry.coordinates[0].length >= 4);

    return {
      type: 'FeatureCollection',
      features
    };
  }, [parcels, activeParcel, is3DMode]);

  // Attach layers to MapLibre
  const addCadastreLayers = (map) => {
    if (!map) return;

    if (!map.getSource('cadastre-source')) {
      map.addSource('cadastre-source', {
        type: 'geojson',
        data: parcelsGeoJson
      });
    } else {
      map.getSource('cadastre-source').setData(parcelsGeoJson);
    }

    // 1. 3D Volumetric Extrusion Building Boxes Layer
    if (!map.getLayer('cadastre-extrusions')) {
      map.addLayer({
        id: 'cadastre-extrusions',
        type: 'fill-extrusion',
        source: 'cadastre-source',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.92
        }
      });
    }

    // 2. Crisp 3D Roof Outline
    if (!map.getLayer('cadastre-outlines')) {
      map.addLayer({
        id: 'cadastre-outlines',
        type: 'line',
        source: 'cadastre-source',
        paint: {
          'line-color': ['get', 'roofBorder'],
          'line-width': ['case', ['get', 'isSelected'], 3.5, 1.8],
          'line-opacity': 0.95
        }
      });
    }

    // Click handler for parcels
    map.off('click', 'cadastre-extrusions');
    map.on('click', 'cadastre-extrusions', (e) => {
      if (e.features && e.features.length > 0) {
        const feat = e.features[0];
        const found = parcels.find(p => (p.ulpin || p.id) === feat.properties.ulpin);
        if (found && onSelectParcel) {
          onSelectParcel(found);
        }
      }
    });

    map.on('mouseenter', 'cadastre-extrusions', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'cadastre-extrusions', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  // Render HTML badges & icons above 3D building boxes
  const updateHtmlTags = (map) => {
    if (!map) return;
    parcelMarkersRef.current.forEach(m => m.remove());
    parcelMarkersRef.current = [];

    // Render interactive micro badges for parcels
    parcels.slice(0, 45).forEach((p) => {
      const c = getParcelCentroid(p);
      const isSelected = activeParcel && (activeParcel.ulpin === p.ulpin || activeParcel.id === p.id);
      const theme = getStatusTheme(p);
      const shortTag = (p.survey_number || p.surveyNumber || p.ulpin || '').replace('SN-', '');

      const el = document.createElement('div');
      el.className = 'cadastre-parcel-tag';
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          background: ${isSelected ? '#0284c7' : '#0d1527'};
          color: white;
          padding: 2.5px 6px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 9.5px;
          font-weight: 700;
          border: 1.5px solid ${isSelected ? '#38bdf8' : theme.color};
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          white-space: nowrap;
          transform: translate(-50%, -120%);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="display:inline-block; width:6px; height:6px; border-radius:9999px; background:${theme.color};"></span>
          <span>${shortTag}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        if (onSelectParcel) onSelectParcel(p);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.lng, c.lat])
        .addTo(map);

      parcelMarkersRef.current.push(marker);
    });
  };

  // Helper to ensure user location blue beacon is active on map
  const renderUserMarker = (map, lat, lng) => {
    if (!map || lat == null || lng == null) return;

    if (!userMarkerRef.current) {
      const el = createUserLocationElement();
      userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([lng, lat]);
      // Ensure marker is attached to map instance
      if (!userMarkerRef.current._map) {
        userMarkerRef.current.addTo(map);
      }
    }
  };

  // 1. Initialize MapLibre GL
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyleConfig = BASE_MAP_STYLES[activeStyleKey]?.style || BASE_MAP_STYLES.osmStreets.style;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyleConfig,
      center: [77.5148, 28.4633], // Greater Noida Cadastre Center
      zoom: targetZoom || 15.5,
      minZoom: 1,
      maxZoom: 20,
      maxTileCacheSize: 300,
      pitch: is3DMode ? 52 : 0,
      bearing: -15,
      antialias: true,
      attributionControl: false,
      renderWorldCopies: false,
      trackResize: true,
      fadeDuration: 0
    });

    mapRef.current = map;

    map.on('load', () => {
      addCadastreLayers(map);
      updateHtmlTags(map);
      if (userLocation && userLocation.lat && userLocation.lng) {
        renderUserMarker(map, userLocation.lat, userLocation.lng);
      }
      map.resize();
    });

    map.on('rotate', () => {
      setCurrentBearing(Math.round(map.getBearing()));
    });

    // Resize invalidations
    const t1 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 100);
    const t2 = setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 400);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      parcelMarkersRef.current.forEach(m => m.remove());
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Update GeoJSON Source data when parcels change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      const src = map.getSource('cadastre-source');
      if (src) {
        src.setData(parcelsGeoJson);
      } else {
        addCadastreLayers(map);
      }
      updateHtmlTags(map);
    }
  }, [parcelsGeoJson]);

  // 3. Switch Basemap Style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const selected = BASE_MAP_STYLES[activeStyleKey];
    if (selected && selected.style) {
      map.setStyle(selected.style);
      map.once('style.load', () => {
        addCadastreLayers(map);
        updateHtmlTags(map);
        if (userLocation && userLocation.lat && userLocation.lng) {
          renderUserMarker(map, userLocation.lat, userLocation.lng);
        }
      });
    }
  }, [activeStyleKey]);

  // 4. Toggle 2D / 3D Camera Tilt
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      pitch: is3DMode ? 52 : 0,
      bearing: is3DMode ? -15 : 0,
      duration: 650
    });

    if (map.isStyleLoaded()) {
      addCadastreLayers(map);
    }
  }, [is3DMode]);

  // 5. Handle flyTo coords or active parcel selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (flyToCoords) {
      map.flyTo({
        center: [flyToCoords[0], flyToCoords[1]],
        zoom: 16.5,
        pitch: is3DMode ? 52 : 0,
        speed: 1.2
      });
    } else if (activeParcel) {
      const c = getParcelCentroid(activeParcel);
      map.flyTo({
        center: [c.lng, c.lat],
        zoom: 17,
        pitch: is3DMode ? 52 : 0,
        speed: 1.2
      });
    }
  }, [flyToCoords, activeParcel, is3DMode]);

  // 6. Live User GPS Location Radar Marker Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation && userLocation.lat && userLocation.lng) {
      renderUserMarker(map, userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  // Handlers
  const handleToggle2D3D = () => {
    const next = !is3DMode;
    setIs3DMode(next);
    if (onToggleTilt) onToggleTilt(next);
  };

  const handleFitAllBounds = () => {
    const map = mapRef.current;
    if (!map || parcels.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    parcels.forEach((p) => {
      if (Array.isArray(p.boundary)) {
        p.boundary.forEach((coord) => {
          bounds.extend([Number(coord[0]), Number(coord[1])]);
        });
      }
    });

    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      pitch: is3DMode ? 52 : 0,
      duration: 700,
      essential: true
    });
  };

  const handleResetOrientation = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      bearing: 0,
      pitch: is3DMode ? 52 : 0,
      duration: 400,
      essential: true
    });
  };

  // High-Accuracy Live Location Redirect Handler
  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!map) return;

    setGeoLocating(true);
    setGeoStatusMsg('Acquiring high-accuracy GPS coordinates...');

    // If we already have live location in props, fly there immediately & render marker
    if (userLocation && userLocation.lng && userLocation.lat) {
      setGeoLocating(false);
      setGeoStatusMsg('Redirected to live GPS location');
      renderUserMarker(map, userLocation.lat, userLocation.lng);
      setTimeout(() => setGeoStatusMsg(''), 3000);
      map.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 17,
        pitch: is3DMode ? 52 : 0,
        speed: 1.8,
        curve: 1.1,
        essential: true
      });
      return;
    }

    if (!navigator.geolocation) {
      setGeoLocating(false);
      setGeoStatusMsg('Geolocation is not supported by your browser.');
      setTimeout(() => setGeoStatusMsg(''), 4000);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const { latitude, longitude } = pos.coords;
        setGeoStatusMsg('Redirected to live GPS location');
        setTimeout(() => setGeoStatusMsg(''), 3000);

        renderUserMarker(map, latitude, longitude);

        map.flyTo({
          center: [longitude, latitude],
          zoom: 17,
          pitch: is3DMode ? 52 : 0,
          speed: 1.8,
          curve: 1.1,
          essential: true
        });
      },
      (err) => {
        setGeoLocating(false);
        setGeoStatusMsg('GPS permission denied or unavailable. Centered on registry district.');
        setTimeout(() => setGeoStatusMsg(''), 4500);
        map.flyTo({
          center: [77.5148, 28.4633],
          zoom: 16.5,
          pitch: is3DMode ? 52 : 0,
          speed: 1.4,
          essential: true
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#e5e7eb] ${className}`}>
      {/* MapLibre 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Geolocation Toast Notification */}
      {geoStatusMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 text-sky-300 text-xs border border-sky-500/30 shadow-2xl backdrop-blur-md flex items-center gap-2">
          <LocateFixed className="w-3.5 h-3.5 text-sky-400 animate-spin" />
          <span>{geoStatusMsg}</span>
        </div>
      )}

      {/* Floating Right Map Controls */}
      {showControls && (
        <div className="absolute right-4 bottom-8 z-30 flex flex-col items-center bg-[#0d1527]/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-1.5 space-y-1 text-slate-300 pointer-events-auto">
          {/* 1. 2D / 3D Toggle */}
          <button
            type="button"
            onClick={handleToggle2D3D}
            title={is3DMode ? "Switch to 2D Flat Mode" : "Switch to 3D Extruded Perspective"}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              is3DMode ? 'bg-sky-600 text-white shadow-md shadow-sky-600/40' : 'hover:bg-white/10 text-slate-300'
            }`}
          >
            <Mountain className="w-4 h-4" />
          </button>

          {/* 2. Basemap Style Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(prev => !prev)}
              title="Change Map Style"
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-12 bottom-0 w-64 bg-[#0d1527]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 shadow-2xl z-40 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Select Basemap (Free, No Keys)
                </div>
                {Object.values(BASE_MAP_STYLES).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveStyleKey(p.id);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      activeStyleKey === p.id
                        ? 'bg-sky-600/20 text-sky-400 font-semibold border border-sky-500/30'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.sublabel}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Compass / Heading Indicator */}
          <button
            type="button"
            onClick={handleResetOrientation}
            title={`Bearing: ${currentBearing}° - Click to reset North`}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
          >
            <Compass 
              className="w-4 h-4 text-sky-400 transition-transform duration-200" 
              style={{ transform: `rotate(${-currentBearing}deg)` }}
            />
          </button>

          {/* 4. Auto-fit All Parcels Bounds */}
          <button
            type="button"
            onClick={handleFitAllBounds}
            title="Fit All Registered Parcels"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* 5. Live User GPS Locate (Redirect to live location) */}
          <button
            type="button"
            onClick={handleLocateMe}
            title="Redirect to My Current GPS Location"
            className={`w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer ${
              geoLocating ? 'animate-pulse text-sky-400 ring-2 ring-sky-500/50' : ''
            }`}
          >
            <LocateFixed className="w-4 h-4 text-sky-400" />
          </button>

          <div className="w-5 h-[1px] bg-white/15 my-1" />

          {/* 6. Zoom In (+) */}
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomIn()}
            title="Zoom In"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* 7. Zoom Out (-) */}
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomOut()}
            title="Zoom Out"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Cadastral3DMap;