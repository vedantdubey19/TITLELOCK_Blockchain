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
  Maximize2
} from 'lucide-react';

export function CitizenPublicMapPage() {
  const { parcels } = useAuth();
  const [selectedParcel, setSelectedParcel] = useState(parcels[0]);
  const [activeLayer, setActiveLayer] = useState('cadastral'); // 'cadastral' | 'satellite' | 'fraud'

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            3D Public Cadastral Land Map
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
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden relative min-h-[460px] flex flex-col">
          
          {/* Top HUD Controls */}
          <div className="p-3 sm:p-3.5 bg-slate-900/90 backdrop-blur-md text-white flex flex-wrap items-center justify-between gap-2 z-10 text-xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-400 animate-spin duration-3000" />
              <span className="font-mono text-[11px] sm:text-xs">Lat: 28.46306° N • Lon: 77.51454° E</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                GPS Precision: ±0.05m
              </span>
              <button className="text-slate-400 hover:text-white cursor-pointer" title="Fullscreen">
                <Maximize2 className="w-4 h-4" />
              </button>
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
            <div className="relative z-10 text-center">
              <div className="w-64 h-48 sm:w-80 sm:h-60 rounded-3xl border-2 border-emerald-400/80 bg-emerald-500/10 backdrop-blur-sm shadow-[0_0_50px_rgba(16,185,129,0.3)] relative mx-auto flex flex-col items-center justify-center p-4 transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <div className="absolute top-2 left-3 font-mono text-[10px] text-emerald-300">
                  Cadastral Plot Polygon
                </div>
                <div className="font-mono font-bold text-white text-base sm:text-lg">
                  {selectedParcel.id}
                </div>
                <div className="text-xs text-emerald-200 mt-1">
                  Area: {selectedParcel.areaSqm} m² • Survey {selectedParcel.surveyNumber}
                </div>
                <div className="mt-3 px-3 py-1 rounded-full bg-slate-900/80 text-[11px] font-mono text-cyan-300 border border-cyan-500/40">
                  Immutable Polygon Hash: 0x9e5...248
                </div>
              </div>
            </div>

            {/* Bottom floating legend */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none">
              <span>Projection: EPSG:4326 (WGS 84)</span>
              <span className="text-brand-orange font-bold">Drone Lidar Attestation Verified</span>
            </div>
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Select Cadastral Plot
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Inspect 3D coordinates & geofence</p>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {parcels.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedParcel(p)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedParcel.id === p.id
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs'
                    : 'bg-white/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{p.id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    p.status === 'VERIFIED' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Survey: {p.surveyNumber} • {p.areaSqm} m²
                </div>
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
            <div className="font-semibold text-slate-900 dark:text-white">Selected Plot Coordinates</div>
            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
              NW: 77.51454, 28.46306<br/>
              NE: 77.51502, 28.46306<br/>
              SE: 77.51502, 28.46352<br/>
              SW: 77.51454, 28.46352
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default CitizenPublicMapPage;
