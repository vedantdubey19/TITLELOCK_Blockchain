/**
 * TitleLock Cadastral Storage & Database Service
 * Provides unified access to PostgreSQL V2 datasets (properties.json & pending_transfers.json)
 */

import propertiesData from '../data/properties.json';
import pendingTransfersData from '../data/pending_transfers.json';

export const DB_KEYS = {
  USER: 'titlelock_user',
  REGISTERED_USERS: 'titlelock_registered_users',
  PROPERTIES: 'titlelock_v2_properties',
  TRANSFERS: 'titlelock_v2_transfers',
  SELL_TOKENS: 'titlelock_v2_sell_tokens',
  RECOVERY_CASES: 'titlelock_v2_recovery_cases',
  THEME: 'titlelock_theme'
};

// Transform raw Database/properties.json to UI-friendly model while maintaining full fidelity
function normalizeProperty(raw) {
  const isFrozen = Boolean(raw.frozen);
  let statusVariant = 'success';
  if (isFrozen || raw.title_status === 'FROZEN') statusVariant = 'danger';
  else if (raw.title_status === 'DISPUTED') statusVariant = 'danger';
  else if (raw.title_status === 'REVIEW' || raw.title_status === 'VERIFIED_WITH_ENCUMBRANCE') statusVariant = 'warning';
  else if (raw.title_status === 'SUCCESSION_PENDING') statusVariant = 'default';

  const healthScore = isFrozen
    ? 25
    : raw.title_status === 'DISPUTED'
    ? 40
    : raw.title_status === 'REVIEW'
    ? 65
    : raw.title_status === 'VERIFIED_WITH_ENCUMBRANCE'
    ? 78
    : 98;

  const firstNominee = raw.nominees && raw.nominees[0] ? raw.nominees[0] : null;
  const lastHistory = raw.transfer_history && raw.transfer_history.length > 0 
    ? raw.transfer_history[raw.transfer_history.length - 1] 
    : null;

  return {
    id: raw.ulpin,
    ulpin: raw.ulpin,
    title: raw.ulpin,
    surveyNumber: raw.survey_number || 'SN-N/A',
    currentOwner: raw.current_owner,
    ownershipType: raw.ownership_type,
    owners: raw.owners || [],
    ownershipPolicy: raw.ownership_policy || { required_approvals: 1, total_owners: 1 },
    nominees: raw.nominees || [],
    encumbrances: raw.encumbrances || [],
    disputes: raw.disputes || [],
    frozen: isFrozen,
    areaSqm: raw.area_sqm,
    registrationOffice: raw.registration_office || 'Sub-Registrar Noida',
    lastRegisteredDate: raw.last_registered_date,
    titleStatus: raw.title_status,
    status: raw.title_status ? raw.title_status.replace(/_/g, ' ') : 'VERIFIED',
    riskStatus: raw.risk_status,
    statusVariant,
    healthScore,
    boundary: raw.boundary || [],
    transferHistory: raw.transfer_history || [],
    deedHash: lastHistory?.doc_hash || '0x7f9a81c2049eb1',
    blockchainTx: '0x892a014ef982c014',
    nomineeName: firstNominee?.name || null,
    nomineeRelation: firstNominee?.relationship || null,
    nomineeStatus: firstNominee?.status ? `${firstNominee.status} (Owner Active)` : null,
    encumbranceDetails: raw.encumbrances?.[0] 
      ? `${raw.encumbrances[0].holder} (${raw.encumbrances[0].type}) - INR ${raw.encumbrances[0].amount_inr?.toLocaleString()}` 
      : null,
    disputeDetails: raw.disputes?.[0]
      ? `${raw.disputes[0].claimant} (${raw.disputes[0].type}) - Filed: ${raw.disputes[0].filed_date}`
      : null
  };
}

// Transform raw pending transfers to interactive transfer objects
function normalizeTransfer(raw) {
  return {
    id: raw.request_id,
    requestId: raw.request_id,
    ulpin: raw.ulpin,
    parcelId: raw.ulpin,
    seller: raw.seller,
    buyer: raw.buyer,
    claimedAreaSqm: raw.claimed_area_sqm,
    transactionDate: raw.transaction_date,
    note: raw.note,
    claimedBoundary: raw.claimed_boundary || null,
    status: raw.note?.includes('Auto-approve') || raw.note?.includes('Should auto-approve')
      ? 'AWAITING_REGISTRAR'
      : raw.note?.includes('Wrong seller') || raw.note?.includes('Backdated') || raw.note?.includes('Disputed')
      ? 'UNDER_REVIEW'
      : 'PENDING_APPROVAL',
    stage: 'OWNER_APPROVAL',
    documentHash: '0x' + Math.random().toString(16).substring(2, 18),
    createdDate: raw.transaction_date
  };
}

// Build standard user personas with Rajesh Kumar as the primary matching the reference screenshot
export function generateDatabasePersonas() {
  const personas = [
    {
      id: 'USR-001',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@titlelock.gov.in',
      username: 'rajesh_kumar',
      password: 'Demo@001',
      role: 'CITIZEN',
      status: 'ACTIVE',
      activeRole: 'OWNER',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      wallet: '0x742d35Cc6634C0532925a3b8448c454e4438f44c',
      description: 'Verified Titleholder with 8 registered cadastre parcels',
      jurisdiction: 'Gautam Buddha Nagar / Noida, UP'
    },
    {
      id: 'USR-RADHA-01',
      name: 'Radha Sharma',
      email: 'radha.sharma@titlelock.gov.in',
      username: 'radha_sharma',
      password: 'Demo@001',
      role: 'CITIZEN',
      status: 'ACTIVE',
      activeRole: 'OWNER',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      wallet: '0x742d35Cc6634C0532925a3b8448c454e4438f44c',
      description: 'Multiple titleholder (UP-0041 & UP-0053 Frozen Velocity)',
      jurisdiction: 'Noida-I / Greater Noida, UP'
    },
    {
      id: 'USR-MEENA-02',
      name: 'Meena Gupta',
      email: 'meena.gupta@titlelock.gov.in',
      username: 'meena_gupta',
      password: 'Demo@002',
      role: 'CITIZEN',
      status: 'ACTIVE',
      activeRole: 'OWNER',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      wallet: '0x45B3...C821',
      description: 'Owner with active Bank Lien encumbrance (UP-0019) & Joint (UP-0020)',
      jurisdiction: 'Sub-Registrar Noida-I, UP'
    },
    {
      id: 'USR-JYOTI-03',
      name: 'Jyoti Bhati',
      email: 'jyoti.bhati@titlelock.gov.in',
      username: 'jyoti_bhati',
      password: 'Demo@003',
      role: 'CITIZEN',
      status: 'ACTIVE',
      activeRole: 'NOMINEE',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      wallet: '0x19Fa...33DA',
      description: 'Sole owner (UP-0049) & registered Nominee for UP-0012',
      jurisdiction: 'Sub-Registrar Noida-II, UP'
    },
    {
      id: 'USR-GEETA-04',
      name: 'Geeta Goel',
      email: 'geeta.goel@titlelock.gov.in',
      username: 'geeta_goel',
      password: 'Demo@004',
      role: 'CITIZEN',
      status: 'ACTIVE',
      activeRole: 'BUYER',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      wallet: '0x88Ca...901B',
      description: 'Registered prospective Buyer with active deed petition (REQ-01)',
      jurisdiction: 'Gautam Buddha Nagar, UP'
    },
    // Registrar Accounts
    {
      id: 'REG-NOIDA-01',
      name: 'Virendra Swarup (Sub-Registrar)',
      email: 'registrar.noida@titlelock.gov.in',
      username: 'registrar_noida',
      password: 'Registrar@001',
      role: 'REGISTRAR',
      status: 'ACTIVE',
      activeRole: 'REGISTRAR',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      wallet: '0x992B...A041',
      description: 'Sub-Registrar Officer • Tehsil Dadri / Gautam Buddha Nagar-I',
      jurisdiction: 'Sub-Registrar Noida-I / Gautam Buddha Nagar, UP'
    },
    {
      id: 'REG-DADRI-02',
      name: 'Dr. Anand Prakash (District Registrar)',
      email: 'subregistrar.dadri@titlelock.gov.in',
      username: 'subregistrar_dadri',
      password: 'Registrar@002',
      role: 'REGISTRAR',
      status: 'ACTIVE',
      activeRole: 'REGISTRAR',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      wallet: '0x71Ae...F829',
      description: 'District Registrar & Statutory Deed Adjudicator',
      jurisdiction: 'Dadri Sub-District Registry Office, UP'
    }
  ];
  return personas;
}

export class CadastreDatabaseService {
  /**
   * Retrieve all seed database citizen personas + registered users
   */
  static getDemoUsers() {
    const base = generateDatabasePersonas();
    try {
      const stored = localStorage.getItem(DB_KEYS.REGISTERED_USERS);
      if (stored) {
        const customUsers = JSON.parse(stored);
        return [...customUsers, ...base];
      }
    } catch (e) {
      // fallback to base
    }
    return base;
  }

  /**
   * Register a new user (Citizen or Registrar) into local database
   */
  static registerUser(userData) {
    try {
      const stored = localStorage.getItem(DB_KEYS.REGISTERED_USERS);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(userData);
      localStorage.setItem(DB_KEYS.REGISTERED_USERS, JSON.stringify(list));
      return { success: true, user: userData };
    } catch (e) {
      return { success: false, message: 'Could not write to local storage' };
    }
  }

  /**
   * Get prospective buyers from pending transfer records
   */
  static getTargetBuyers() {
    const rawTransfers = this.getTransfers();
    const buyerMap = new Map();
    rawTransfers.forEach((t, idx) => {
      if (t.buyer && !buyerMap.has(t.buyer)) {
        buyerMap.set(t.buyer, {
          id: `USR-BUY-${String(idx + 1).padStart(3, '0')}`,
          name: t.buyer,
          wallet: `0x${(1000 + idx).toString(16)}...${(9000 + idx).toString(16)}`
        });
      }
    });
    return Array.from(buyerMap.values()).slice(0, 15);
  }

  /**
   * Get active user from local storage or fallback to Rajesh Kumar
   */
  static getActiveUser() {
    try {
      const data = localStorage.getItem(DB_KEYS.USER);
      if (data) return JSON.parse(data);
      const personas = generateDatabasePersonas();
      return personas[0];
    } catch {
      return generateDatabasePersonas()[0];
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
   * Get all registered cadastral parcels (full 100 properties)
   */
  static getParcels() {
    try {
      const data = localStorage.getItem(DB_KEYS.PROPERTIES);
      if (data) {
        return JSON.parse(data);
      }
      const initial = propertiesData.map(normalizeProperty);
      localStorage.setItem(DB_KEYS.PROPERTIES, JSON.stringify(initial));
      return initial;
    } catch {
      return propertiesData.map(normalizeProperty);
    }
  }

  /**
   * Save parcels to storage
   */
  static saveParcels(parcels) {
    try {
      localStorage.setItem(DB_KEYS.PROPERTIES, JSON.stringify(parcels));
    } catch (e) {
      console.warn('Storage quota exceeded, caching in memory', e);
    }
  }

  /**
   * Get pending transfers & conveyance petitions (100 records)
   */
  static getTransfers() {
    try {
      const data = localStorage.getItem(DB_KEYS.TRANSFERS);
      if (data) {
        return JSON.parse(data);
      }
      const initial = pendingTransfersData.map(normalizeTransfer);
      localStorage.setItem(DB_KEYS.TRANSFERS, JSON.stringify(initial));
      return initial;
    } catch {
      return pendingTransfersData.map(normalizeTransfer);
    }
  }

  /**
   * Save transfers to storage
   */
  static saveTransfers(transfers) {
    try {
      localStorage.setItem(DB_KEYS.TRANSFERS, JSON.stringify(transfers));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
    }
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
   * Get active recovery cooling-off cases
   */
  static getRecoveryCases() {
    try {
      const data = localStorage.getItem(DB_KEYS.RECOVERY_CASES);
      return data ? JSON.parse(data) : [
        {
          id: 'REC-2026-9014',
          parcelId: 'UP-0053-VELOCITY-TARGET',
          user: 'Radha Sharma',
          status: 'COOLING_OFF',
          daysRemaining: 4,
          hoursRemaining: 14,
          startedAt: '2026-10-01',
          newWallet: '0x992B...A041'
        }
      ];
    } catch {
      return [];
    }
  }

  /**
   * Reset all state back to initial database seeds
   */
  static resetToDefaults() {
    localStorage.removeItem(DB_KEYS.USER);
    localStorage.removeItem(DB_KEYS.REGISTERED_USERS);
    localStorage.removeItem(DB_KEYS.PROPERTIES);
    localStorage.removeItem(DB_KEYS.TRANSFERS);
    localStorage.removeItem(DB_KEYS.SELL_TOKENS);
    localStorage.removeItem(DB_KEYS.RECOVERY_CASES);
  }
}

export default CadastreDatabaseService;
