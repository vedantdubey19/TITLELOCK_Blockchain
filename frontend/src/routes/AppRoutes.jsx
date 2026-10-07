import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import CitizenLayout from '../layouts/CitizenLayout';
import RegistrarLayout from '../layouts/RegistrarLayout';

import CitizenLoginPage from '../pages/CitizenLoginPage';
import CitizenDashboardPage from '../pages/CitizenDashboardPage';
import CitizenPropertiesPage from '../pages/CitizenPropertiesPage';
import CitizenTransactionsPage from '../pages/CitizenTransactionsPage';
import CitizenPublicMapPage from '../pages/CitizenPublicMapPage';
import CitizenFullscreenMapPage from '../pages/CitizenFullscreenMapPage';
import CitizenNomineesPage from '../pages/CitizenNomineesPage';
import CitizenTokensPage from '../pages/CitizenTokensPage';
import CitizenRecoveryPage from '../pages/CitizenRecoveryPage';
import CitizenNotificationsPage from '../pages/CitizenNotificationsPage';
import CitizenTransfersPage from '../pages/CitizenTransfersPage';
import CitizenDeedsPage from '../pages/CitizenDeedsPage';
import CitizenProfilePage from '../pages/CitizenProfilePage';
import CitizenSettingsPage from '../pages/CitizenSettingsPage';

// Registrar Pages
import RegistrarDashboardPage from '../pages/RegistrarDashboardPage';
import RegistrarPetitionsPage from '../pages/RegistrarPetitionsPage';
import RegistrarSuccessionPage from '../pages/RegistrarSuccessionPage';
import RegistrarRiskPage from '../pages/RegistrarRiskPage';
import RegistrarAuditPage from '../pages/RegistrarAuditPage';
import RegistrarCredentialsPage from '../pages/RegistrarCredentialsPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to citizen dashboard */}
      <Route path="/" element={<Navigate to="/citizen/dashboard" replace />} />

      {/* Unified Authentication Screen (Citizen & Registrar Sign In & Sign Up) */}
      <Route path="/citizen/login" element={<CitizenLoginPage />} />
      <Route path="/registrar/login" element={<CitizenLoginPage />} />

      {/* Dedicated Fullscreen Map Route without Layout shell */}
      <Route path="/citizen/map/fullscreen" element={<CitizenFullscreenMapPage />} />

      {/* Citizen Authenticated Portal */}
      <Route path="/citizen" element={<CitizenLayout />}>
        <Route index element={<Navigate to="/citizen/dashboard" replace />} />
        
        {/* Core Navigation Matching Reference UI */}
        <Route path="dashboard" element={<CitizenDashboardPage />} />
        <Route path="properties" element={<CitizenPropertiesPage />} />
        <Route path="transactions" element={<CitizenTransactionsPage />} />
        <Route path="map" element={<CitizenPublicMapPage />} />
        
        {/* Subpages & Deep Links */}
        <Route path="deeds" element={<CitizenTransactionsPage />} />
        <Route path="transfers" element={<CitizenTransactionsPage />} />
        <Route path="tokens" element={<CitizenTokensPage />} />
        <Route path="nominees" element={<CitizenNomineesPage />} />
        <Route path="recovery" element={<CitizenRecoveryPage />} />
        <Route path="notifications" element={<CitizenNotificationsPage />} />
        <Route path="profile" element={<CitizenProfilePage />} />
        <Route path="settings" element={<CitizenSettingsPage />} />
      </Route>

      {/* Official Sub-Registrar Portal Matching Reference Screenshots */}
      <Route path="/registrar" element={<RegistrarLayout />}>
        <Route index element={<Navigate to="/registrar/dashboard" replace />} />
        
        <Route path="dashboard" element={<RegistrarDashboardPage />} />
        <Route path="petitions" element={<RegistrarPetitionsPage />} />
        <Route path="succession" element={<RegistrarSuccessionPage />} />
        <Route path="risk" element={<RegistrarRiskPage />} />
        <Route path="audit" element={<RegistrarAuditPage />} />
        <Route path="credentials" element={<RegistrarCredentialsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/citizen/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
