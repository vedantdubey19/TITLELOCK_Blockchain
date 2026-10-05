import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, Lock, ArrowRight } from 'lucide-react';

export function CitizenRecoveryPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 4,
    hours: 14,
    mins: 32,
    secs: 7,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <div className="space-y-5">
      
      {/* 1. Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Lost Owner Key Recovery & Cooling-Off Desk
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Statutory credential re-issuance under Sub-Registrar biometric verification and mandatory cooling-off period.
        </p>
      </div>

      {/* 2. STATUTORY COOLING-OFF ACTIVE (SCN-13) Banner */}
      <div className="rounded-xl p-4 bg-sky-500/10 border border-sky-500/20 text-xs flex items-start gap-3">
        <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wide">
            STATUTORY COOLING-OFF ACTIVE (SCN-13)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Parcel <strong className="text-sky-700 dark:text-sky-300 font-mono">UP-NOT-0012-KEY-RECOVERY</strong> is currently undergoing owner credential rotation. To prevent fraudulent transfers, a mandatory <strong className="text-slate-900 dark:text-slate-200">7-day cooling-off period</strong> is enforced before new signing credentials are activated.
          </p>
        </div>
      </div>

      {/* 3. Main Desk Card */}
      <div className="glass-panel rounded-xl p-6 sm:p-10 text-center border border-slate-200/80 dark:border-white/10">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
          Cooling-Off Period Remaining
        </div>

        {/* Countdown Digits Grid */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 md:gap-4 max-w-md mx-auto mb-8 font-mono">
          <div className="flex-1 p-2 sm:p-3.5 bg-slate-100/80 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {timeLeft.days}
            </span>
            <span className="block mt-1 text-[9px] sm:text-[10px] uppercase text-slate-500 font-sans tracking-wider">
              Days
            </span>
          </div>

          <span className="text-lg sm:text-xl font-bold text-slate-400 dark:text-slate-600">:</span>

          <div className="flex-1 p-2 sm:p-3.5 bg-slate-100/80 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {formatNumber(timeLeft.hours)}
            </span>
            <span className="block mt-1 text-[9px] sm:text-[10px] uppercase text-slate-500 font-sans tracking-wider">
              Hours
            </span>
          </div>

          <span className="text-lg sm:text-xl font-bold text-slate-400 dark:text-slate-600">:</span>

          <div className="flex-1 p-2 sm:p-3.5 bg-slate-100/80 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="text-xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {formatNumber(timeLeft.mins)}
            </span>
            <span className="block mt-1 text-[9px] sm:text-[10px] uppercase text-slate-500 font-sans tracking-wider">
              Mins
            </span>
          </div>

          <span className="text-lg sm:text-xl font-bold text-slate-400 dark:text-slate-600">:</span>

          <div className="flex-1 p-2 sm:p-3.5 bg-slate-100/80 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="text-xl sm:text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400">
              {formatNumber(timeLeft.secs)}
            </span>
            <span className="block mt-1 text-[9px] sm:text-[10px] uppercase text-slate-500 font-sans tracking-wider">
              Secs
            </span>
          </div>
        </div>

        {/* Status boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left text-xs mb-8">
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-emerald-800 dark:text-emerald-300">
                Biometric Re-verification: PASSED
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Owner identity verified in-person with Aadhaar Iris Match.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-rose-800 dark:text-rose-300">
                Conveyance Actions: LOCKED
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Sell key issuance remains disabled until countdown elapses.
              </div>
            </div>
          </div>
        </div>

        <div>
          <Link
            to="/citizen/properties"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span>Return to Registered Properties</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </Link>
        </div>

      </div>

    </div>
  );
}

export default CitizenRecoveryPage;
