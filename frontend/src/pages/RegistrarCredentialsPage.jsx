import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  RotateCcw, 
  Save, 
  ShieldCheck, 
  KeyRound, 
  Fingerprint, 
  CheckCircle2, 
  Building2,
  Lock,
  Edit3,
  Check
} from 'lucide-react';

export function RegistrarCredentialsPage() {
  const { currentUser, resetDemoState, showToast } = useAuth();

  const [dualControl, setDualControl] = useState(true);
  const [sessionExpiry, setSessionExpiry] = useState('60');
  const [employeeId, setEmployeeId] = useState(currentUser?.id || 'GOV-REG-0182');
  const [jurisdiction, setJurisdiction] = useState(currentUser?.jurisdiction || 'Noida & Greater Noida (Sector 1-168)');
  const [status, setStatus] = useState('ACTIVE');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    showToast('Sub-Registrar administrative credentials updated successfully', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header & Reset Demo matching Reference Screenshot exactly:
          Sub-Registrar Employee Credentials + Reset Demo Data button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sub-Registrar Employee Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official badge registration, statutory adjudication jurisdiction, and dual-control settings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetDemoState();
            setEmployeeId('GOV-REG-0182');
            setJurisdiction('Noida & Greater Noida (Sector 1-168)');
            showToast('Demo state and officer credentials restored to official baseline', 'warning');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 font-bold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Main Credentials Card matching Reference Screenshot */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100/90 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] space-y-6">
        
        {/* Officer Hero Profile Box matching Reference UI */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-[#0b6b4e] text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
            SR
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-sky-100 text-sky-800">
                {employeeId}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                {status}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Sub-Registrar Grade I • Office of the Sub-Registrar
            </h2>
            <p className="text-xs text-slate-500">
              Government of Uttar Pradesh • Revenue & Stamps Administration
            </p>
          </div>
        </div>

        {/* 3 Overview Info Boxes matching Reference Screenshot exactly:
            Employee ID: | Jurisdiction: | Administrative Status: */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500">Employee ID:</div>
            {isEditing ? (
              <input 
                type="text" 
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value)} 
                className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white"
              />
            ) : (
              <div className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                {employeeId}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500">Jurisdiction:</div>
            {isEditing ? (
              <input 
                type="text" 
                value={jurisdiction} 
                onChange={(e) => setJurisdiction(e.target.value)} 
                className="w-full px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
              />
            ) : (
              <div className="font-bold text-slate-900 text-xs leading-snug">
                {jurisdiction}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500">Administrative Status:</div>
            <div className="font-extrabold text-emerald-600 text-xs tracking-wider uppercase">
              {status}
            </div>
          </div>
        </div>

        {/* Dual Control Settings & Key Management */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Adjudication Dual-Control & Security Protocols
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-[#0b6b4e] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Credentials'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-800">Dual-Control Quorum Enforcement</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Require 2 independent registrar cryptographic approvals for disputed parcels</div>
              </div>
              <button
                type="button"
                onClick={() => setDualControl(!dualControl)}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  dualControl ? 'bg-[#0b6b4e]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform absolute top-1 left-1 ${
                    dualControl ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-slate-800">Auto-Seal Session Timeout</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Session lock duration for judicial clearance desk</div>
              </div>
              <select
                value={sessionExpiry}
                onChange={(e) => setSessionExpiry(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="120">2 Hours</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-2xl bg-[#0b6b4e] hover:bg-[#08523c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Administrative Settings</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

export default RegistrarCredentialsPage;
