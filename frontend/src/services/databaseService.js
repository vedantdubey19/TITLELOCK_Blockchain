/**
 * TitleLock Cadastral Storage & Database Service
 * Provides centralized, structured access to mock & persisted database records.
 * 
 * Storage Keys:
 * - titlelock_user: Active authenticated citizen profile
 * - titlelock_parcels: Cadastre parcels registry
 * - titlelock_sell_tokens: Generated cryptographic sell authorizations
 * - titlelock_theme: UI appearance ('light' | 'dark')
 */

import { DEMO_USERS, INITIAL_PARCELS, TARGET_BUYERS } from '../constants/mockData';

export const DB_KEYS = {
  USER: 'titlelock_user',
  PARCELS: 'titlelock_parcels',
  SELL_TOKENS: 'titlelock_sell_tokens',
  THEME: 'titlelock_theme'
};

export class CadastreDatabaseService {
  /**
   * Retrieve all seed demo users
   */
  static getDemoUsers() {
    return DEMO_USERS;
  }

  /**
   * Retrieve all target buyers
   */
  static getTargetBuyers() {
    return TARGET_BUYERS;
  }

  /**
   * Get active user from local storage or fallback to default
   */
  static getActiveUser() {
    try {
      const data = localStorage.getItem(DB_KEYS.USER);
      return data ? JSON.parse(data) : DEMO_USERS[0];
    } catch {
      return DEMO_USERS[0];
    }
  }

  /**
   * Save user session to storage
   */
  static setActiveUser(user) {
    if (user) {
      localStorage.setItem(DB_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(DB_KEYS.USER);
    }
  }

  /**
   * Get all registered cadastral parcels
   */
  static getParcels() {
    try {
      const data = localStorage.getItem(DB_KEYS.PARCELS);
      return data ? JSON.parse(data) : INITIAL_PARCELS;
    } catch {
      return INITIAL_PARCELS;
    }
  }

  /**
   * Save parcels to storage
   */
  static saveParcels(parcels) {
    localStorage.setItem(DB_KEYS.PARCELS, JSON.stringify(parcels));
  }

  /**
   * Get all issued sell tokens
   */
  static getSellTokens() {
    try {
      const data = localStorage.getItem(DB_KEYS.SELL_TOKENS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save sell tokens to storage
   */
  static saveSellTokens(tokens) {
    localStorage.setItem(DB_KEYS.SELL_TOKENS, JSON.stringify(tokens));
  }

  /**
   * Reset all state back to initial seed fixtures
   */
  static resetToDefaults() {
    localStorage.removeItem(DB_KEYS.USER);
    localStorage.removeItem(DB_KEYS.PARCELS);
    localStorage.removeItem(DB_KEYS.SELL_TOKENS);
  }
}

export default CadastreDatabaseService;
