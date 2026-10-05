import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import CitizenLayout from '../layouts/CitizenLayout';
import CitizenLoginPage from '../pages/CitizenLoginPage';
import CitizenDashboardPage from '../pages/CitizenDashboardPage';
import CitizenPropertiesPage from '../pages/CitizenPropertiesPage';
import CitizenNomineesPage from '../pages/CitizenNomineesPage';
import CitizenTokensPage from '../pages/CitizenTokensPage';
import CitizenPublicMapPage from '../pages/CitizenPublicMapPage';
import CitizenRecoveryPage from '../pages/CitizenRecoveryPage';
import CitizenNotificationsPage from '../pages/CitizenNotificationsPage';
import CitizenTransfersPage from '../pages/CitizenTransfersPage';
import CitizenDeedsPage from '../pages/CitizenDeedsPage';
import {
  CitizenSuccessionPage,
  CitizenProfilePage,
} from '../pages/CitizenSubpages';

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to citizen login or dashboard */}
      <Route path="/" element={<Navigate to="/citizen/dashboard" replace />} />

      {/* Citizen Authentication Screen */}
      <Route path="/citizen/login" element={<CitizenLoginPage />} />

      {/* Citizen Authenticated Portal */}
      <Route path="/citizen" element={<CitizenLayout />}>
        <Route index element={<Navigate to="/citizen/dashboard" replace />} />
        
        {/* Core screens matched to reference screenshots */}
        <Route path="dashboard" element={<CitizenDashboardPage />} />
        <Route path="properties" element={<CitizenPropertiesPage />} />
        <Route path="nominees" element={<CitizenNomineesPage />} />
        <Route path="tokens" element={<CitizenTokensPage />} />
        <Route path="recovery" element={<CitizenRecoveryPage />} />
        <Route path="notifications" element={<CitizenNotificationsPage />} />
        <Route path="transfers" element={<CitizenTransfersPage />} />
        <Route path="deeds" element={<CitizenDeedsPage />} />
        
        {/* Supplementary pages */}
        <Route path="map" element={<CitizenPublicMapPage />} />
        <Route path="succession" element={<CitizenSuccessionPage />} />
        <Route path="profile" element={<CitizenProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/citizen/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
