import React from 'react';

export function CitizenNotificationsPage() {
  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Statutory Notifications & Deed Alerts
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Official alerts regarding conveyance applications, succession petitions, and title status adjustments.
        </p>
      </div>

      {/* Main Empty State View */}
      <div className="glass-panel rounded-2xl p-8 sm:p-12 text-center">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
          No notifications available.
        </p>
      </div>

    </div>
  );
}

export default CitizenNotificationsPage;
