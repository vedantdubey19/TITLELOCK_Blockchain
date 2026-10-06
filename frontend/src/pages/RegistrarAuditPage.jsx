import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FileClock, 
  Search, 
  Database, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

export function RegistrarAuditPage() {
  const { showToast } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Initial audit events matching reference UI
  const [events, setEvents] = useState([
    {
      id: 'AUD-8921-01',
      action: 'STATUTORY_SEAL_APPLIED',
      target: 'UP-0001-CLEAN',
      actor: 'Sub-Registrar (GOV-REG-0182)',
      details: 'Automated boundary reconciliation verified against Survey of India GIS polygon.',
      timestamp: 'Today, 11:32 AM',
      hash: '0x7f4e...8921'
    },
    {
      id: 'AUD-8920-04',
      action: 'PETITION_COUNTER_SIGNED',
      target: 'UP-0041-VELOCITY-TARGET',
      actor: 'Sub-Registrar (GOV-REG-0182)',
      details: 'Dual biometric consensus unlocked for single-use sell token release.',
      timestamp: 'Yesterday, 04:15 PM',
      hash: '0x12a9...3304'
    },
    {
      id: 'AUD-8919-12',
      action: 'JUDICIAL_FREEZE_ISSUED',
      target: 'UP-0012-VELOCITY-TARGET',
      actor: 'Civil Court / Sub-Registrar',
      details: 'Title locked under Section 5 velocity cooling-off schedule due to backdated claim.',
      timestamp: '2026-09-28 10:00 AM',
      hash: '0x992b...bb18'
    }
  ]);

  const filtered = events.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.id.toLowerCase().includes(term) ||
           e.action.toLowerCase().includes(term) ||
           e.target.toLowerCase().includes(term) ||
           e.actor.toLowerCase().includes(term) ||
           e.details.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header matching Reference UI: Immutable Sub-Registrar Audit Ledger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Immutable Sub-Registrar Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Permanent statutory audit trail of all conveyance determinations, credential rotations, and judicial freezes.
          </p>
        </div>

        <div className="text-[11px] font-mono text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 self-start sm:self-auto font-semibold">
          {events.length} Recorded Events
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter audit events by action, ULPIN, employee badge, or details..."
          className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0b6b4e]"
        />
      </div>

      {/* Main Events Table matching Reference Columns:
          AUDIT ID | ACTION | CADASTRAL TARGET | OFFICER / ACTOR | DETAILS | TIMESTAMP */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Audit ID</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Cadastral Target</th>
                <th className="py-3.5 px-4">Officer / Actor</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {item.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 text-sky-800 border border-sky-100">
                        {item.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800 font-semibold">
                      {item.target}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {item.actor}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {item.details}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {item.timestamp}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No audit events match your filter query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default RegistrarAuditPage;
