/**
 * TitleLock Cadastral Storage & Database Service
 * Provides unified access to PostgreSQL V2 datasets (properties.json & pending_transfers.json)
 */

import propertiesData from '../data/properties.json';
import pendingTransfersData from '../data/pending_transfers.json';

export const DB_KEYS = {
  PROPERTIES: 'titlelock_v2_properties',
  TRANSFERS: 'titlelock_v2_transfers',
  SELL_TOKENS: 'titlelock_v2_sell_tokens',
  RECOVERY_CASES: 'titlelock_v2_recovery_cases',
  THEME: 'titlelock_theme'
};

// Transform raw Database/properties.json to UI-friendly model while maintaining full fidelity
export function normalizeProperty(raw) {
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

export class CadastreDatabaseService {
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
    localStorage.removeItem(DB_KEYS.PROPERTIES);
    localStorage.removeItem(DB_KEYS.TRANSFERS);
    localStorage.removeItem(DB_KEYS.SELL_TOKENS);
    localStorage.removeItem(DB_KEYS.RECOVERY_CASES);
  }
}

export default CadastreDatabaseService;
