import React, { useState } from 'react';
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
  Database
} from 'lucide-react';

export function CitizenPublicMapPage() {
  const { allParcels } = useAuth();
  const [selectedParcel, setSelectedParcel] = useState(allParcels[0] || null);
  const [activeLayer, setActiveLayer] = useState('cadastral'); // 'cadastral' | 'satellite' | 'fraud'
  const [search, setSearch] = useState('');

  const filtered = allParcels.filter(
    (p) =>
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.currentOwner?.toLowerCase().includes(search.toLowerCase()) ||
      p.surveyNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const coords = selectedParcel?.boundary && selectedParcel.boundary.length > 0
    ? selectedParcel.boundary
    : [
        [77.51454, 28.46306],
        [77.51502, 28.46306],
        [77.51502, 28.46352],
        [77.51454, 28.46352]
      ];

  const centerLat = coords[0] ? coords[0][1] : 28.46306;
  const centerLon = coords[0] ? coords[0][0] : 77.51454;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              PostgreSQL Cadastral Geometries Connected
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            3D Public Cadastral Land Map ({allParcels.length} Polygons)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            GIS Polygon boundary validation and multi-sensor aerial overlay under Digital India Land Records.
          </p>
        </div>

        {/* Map Layers */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950/60 p-1 border border-slate-200 dark:border-white/10 shadow-xs text-xs font-semibold">
            {['cadastral', 'satellite', 'fraud'].map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  activeLayer === layer
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Simulated 3D GIS Viewer */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden relative min-h-[480px] flex flex-col">
          
          {/* Top HUD Controls */}
          <div className="p-3 sm:p-3.5 bg-slate-900/90 backdrop-blur-md text-white flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-400 animate-spin duration-3000" />
              <span className="font-mono text-[11px] sm:text-xs">
                Lat: {centerLat}° N • Lon: {centerLon}° E
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                GPS Precision: ±0.05m • WGS 84
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {selectedParcel?.registrationOffice}
              </span>
            </div>
          </div>

          {/* 3D Wireframe / Polygon Viewport */}
          <div className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-[#08182B] relative flex items-center justify-center p-8 overflow-hidden select-none">
            {/* Grid overlay */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, #0284c7 1px, transparent 1px), linear-gradient(to bottom, #0284c7 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />

            {/* Glowing 3D Cadastral Polygon representation */}
            {selectedParcel && (
              <div className="relative z-10 text-center max-w-sm w-full">
                <div className={`rounded-3xl border-2 p-5 backdrop-blur-sm shadow-[0_0_50px_rgba(16,185,129,0.3)] mx-auto flex flex-col items-center justify-center transition-all duration-300 ${
                  selectedParcel.frozen 
                    ? 'border-rose-500/80 bg-rose-950/40' 
                    : selectedParcel.encumbrances?.length > 0
                    ? 'border-amber-500/80 bg-amber-950/40'
                    : 'border-emerald-400/80 bg-emerald-500/10'
                }`}>
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-mono text-[10px] text-emerald-300">
                      Cadastral Polygon #{selectedParcel.surveyNumber}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedParcel.frozen ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {selectedParcel.status}
                    </span>
                  </div>

                  <div className="font-mono font-bold text-white text-base sm:text-lg">
                    {selectedParcel.id}
                  </div>
                  <div className="text-xs text-slate-200 mt-1">
                    Area: <strong className="text-emerald-300">{selectedParcel.areaSqm?.toLocaleString()} m²</strong> • Registered Owner: {selectedParcel.currentOwner}
                  </div>

                  {/* Polygon Coordinates preview */}
                  <div className="mt-3 p-2 rounded-lg bg-black/60 w-full text-left font-mono text-[10px] text-cyan-300 border border-cyan-500/30">
                    <div className="text-slate-400 text-[9px] uppercase">Registered Vertex Points:</div>
                    {coords.slice(0, 3).map((pt, idx) => (
                      <div key={idx}>P{idx+1}: [{pt[0]}, {pt[1]}]</div>
                    ))}
                  </div>

                  <div className="mt-2 text-[10px] font-mono text-slate-400">
                    Cryptographic Root Hash: {selectedParcel.deedHash}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom floating legend */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none">
              <span>Projection: EPSG:4326 (WGS 84)</span>
              <span className="text-brand-orange font-bold">Drone Lidar Attestation Verified</span>
            </div>
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col max-h-[580px]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cadastral Plot Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse all {allParcels.length} geocoded parcels
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by ULPIN or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
            />
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
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    p.statusVariant === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' :
                    p.statusVariant === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400' :
                    'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Owner: {p.currentOwner} • {p.areaSqm} m²
                </div>
              </button>
            ))}
          </div>

          {selectedParcel && (
            <div className="p-3 bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-900 dark:text-white">Active Geometry</div>
              <div className="font-mono text-[10px]">
                Vertex Count: {coords.length} Points<br/>
                Office: {selectedParcel.registrationOffice}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default CitizenPublicMapPage;
