import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { normalizeProperty } from '../services/databaseService';

import { activityApi } from '../services/saleService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const activeRoleView = currentUser?.activeRole || 'OWNER';

  useEffect(() => {
    // Delete old browser accounts, including their plaintext demo passwords.
    try {
      localStorage.removeItem('titlelock_user');
      localStorage.removeItem('titlelock_registered_users');
      for (const key of ['titlelock_v2_properties','titlelock_v2_transfers','titlelock_v2_sell_tokens','titlelock_v2_recovery_cases','titlelock_citizen_settings']) localStorage.removeItem(key);
    } catch { /* Authentication does not require browser storage. */ }
    let cancelled = false;
    authService.me().then((user) => {
      if (!cancelled) setCurrentUser(user);
    }).catch((error) => {
      if (!cancelled && error.status !== 401) setAuthError(error.message);
    }).finally(() => {
      if (!cancelled) setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Global search input in top bar
  const [globalSearch, setGlobalSearch] = useState('');

  const [allParcels, setAllParcels] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [dataRevision, setDataRevision] = useState(0);
  const refreshData = () => setDataRevision((value) => value + 1);
  useEffect(() => {
    let active = true;
    setAllParcels([]); setTransfers([]);
    if (!currentUser) return;
    activityApi('/api/properties/discover').then((rows) => {
      if (active) setAllParcels(rows.map(normalizeProperty));
    }).catch(() => { /* Explorer shows its own request errors. */ });
    activityApi('/api/sales').then((rows) => {
      if (active) setTransfers(rows);
    }).catch(() => { /* Sale screens show their own request errors. */ });
    return () => { active = false; };
  }, [currentUser, dataRevision]);

  // Notification / toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const authenticate = async (action) => {
    try {
      const result = await action();
      if (result.otp_required || result.login_required) return { ...result, success: true };
      setCurrentUser(result.user);
      setAuthError('');
      showToast(`Welcome, ${result.user.name}`, 'success');
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, message: error.message, code: error.code };
    }
  };

  const login = (identifier, password, expectedRole) =>
    authenticate(() => authService.login(identifier, password, expectedRole));

  const signup = (data) => authenticate(() => authService.signup(data));
  const verifyOTP = (data) => authenticate(() => authService.verifyOTP(data));

  const updateProfile = async (data) => {
    const result = await activityApi('/api/auth/profile', data, 'PATCH');
    setCurrentUser(result.login_required ? null : result.user);
    showToast(result.login_required ? 'Contact details saved. Please sign in again.' : 'Profile saved.', 'success');
    return result;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      if (error.status !== 401) {
        showToast(error.message, 'warning');
        return false;
      }
    }
    setCurrentUser(null);
    showToast('Signed out successfully', 'info');
    return true;
  };

  const [propertyState, setPropertyState] = useState({ userId: null, parcels: [], loading: false, error: '', linked: false });
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'CITIZEN') return;
    let cancelled = false;
    setPropertyState({ userId: currentUser.id, parcels: [], loading: true, error: '', linked: false });
    fetch('/api/properties/my', { credentials: 'same-origin' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Could not load properties');
      if (!cancelled) setPropertyState({ userId: currentUser.id, parcels: body.properties.map(normalizeProperty), loading: false, error: '', linked: body.identity_linked });
    }).catch((error) => {
      if (!cancelled) setPropertyState({ userId: currentUser.id, parcels: [], loading: false, error: error.message, linked: false });
    });
    return () => { cancelled = true; };
  }, [currentUser, dataRevision]);
  const userParcels = propertyState.userId === currentUser?.id ? propertyState.parcels : [];
  const propertiesLoading = !!currentUser && (propertyState.userId !== currentUser.id || propertyState.loading);
  const propertiesError = propertyState.userId === currentUser?.id ? propertyState.error : '';

  // Sale visibility is enforced by the backend, never by matching display names.
  const userTransfers = transfers;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authLoading,
        authError,
        login,
        signup,
        verifyOTP,
        logout,
        updateProfile,
        activeRoleView,
        globalSearch,
        setGlobalSearch,
        allParcels,
        parcels: userParcels,
        propertiesLoading,
        propertiesError,
        transfers,
        userTransfers,
        refreshData,
        toast,
        showToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
