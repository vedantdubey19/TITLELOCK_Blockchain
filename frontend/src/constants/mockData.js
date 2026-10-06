import { generateDatabasePersonas } from '../services/databaseService';
import propertiesData from '../data/properties.json';
import pendingTransfersData from '../data/pending_transfers.json';

// Authentic database citizen profiles
export const DEMO_USERS = generateDatabasePersonas();

// Authentic prospective buyers from pending transfer records
export const TARGET_BUYERS = [
  { id: "USR-BUY-001", name: "Amit Sharma", wallet: "0x7F2a...98Cd" },
  { id: "USR-BUY-002", name: "Geeta Goel", wallet: "0x4B3c...E120" },
  { id: "USR-BUY-003", name: "Harpreet Chawla", wallet: "0x89Df...319A" },
  { id: "USR-BUY-004", name: "Sanjay Rao", wallet: "0x12aA...B592" },
  { id: "USR-BUY-005", name: "Pooja Verma", wallet: "0x33bB...554C" },
  { id: "USR-BUY-006", name: "Rekha Rao", wallet: "0x98Fc...771A" }
];

// Initial parcels mapped directly from Database/properties.json
export const INITIAL_PARCELS = propertiesData.map((raw) => {
  const isFrozen = Boolean(raw.frozen);
  let statusVariant = 'success';
  if (isFrozen || raw.title_status === 'FROZEN') statusVariant = 'danger';
  else if (raw.title_status === 'DISPUTED') statusVariant = 'danger';
  else if (raw.title_status === 'REVIEW' || raw.title_status === 'VERIFIED_WITH_ENCUMBRANCE') statusVariant = 'warning';
  else if (raw.title_status === 'SUCCESSION_PENDING') statusVariant = 'default';

  const firstNominee = raw.nominees && raw.nominees[0] ? raw.nominees[0] : null;
  const lastHistory = raw.transfer_history && raw.transfer_history.length > 0 
    ? raw.transfer_history[raw.transfer_history.length - 1] 
    : null;

  return {
    id: raw.ulpin,
    ulpin: raw.ulpin,
    title: raw.ulpin,
    status: raw.title_status ? raw.title_status.replace(/_/g, ' ') : 'VERIFIED',
    statusVariant,
    surveyNumber: raw.survey_number || 'SN-N/A',
    areaSqm: raw.area_sqm,
    tenure: raw.ownership_type,
    health: "/100",
    healthScore: isFrozen ? 25 : raw.title_status === 'DISPUTED' ? 42 : raw.title_status === 'REVIEW' ? 65 : 98,
    primaryOwner: raw.current_owner,
    owners: raw.owners || [],
    ownershipPolicy: raw.ownership_policy || { required_approvals: 1, total_owners: 1 },
    registeredDate: raw.last_registered_date,
    deedHash: lastHistory?.doc_hash || "0x7f9a81c2049eb1",
    blockchainTx: "0x892a014ef982c014",
    nominees: raw.nominees || [],
    encumbrances: raw.encumbrances || [],
    disputes: raw.disputes || [],
    boundary: raw.boundary || [],
    transferHistory: raw.transfer_history || [],
    nomineeName: firstNominee?.name || null,
    nomineeRelation: firstNominee?.relationship || null,
    nomineeShare: firstNominee?.share_percent ? `${firstNominee.share_percent}%` : "100%",
    nomineeStatus: firstNominee?.status ? `${firstNominee.status} (Owner Active)` : null,
    flagReason: isFrozen ? "Title is FROZEN after rapid conveyance triggers" : null
  };
});

// All nominee properties derived from database
export const NOMINEE_PROPERTIES = propertiesData
  .filter((p) => p.nominees && p.nominees.length > 0)
  .map((p) => {
    const nom = p.nominees[0];
    return {
      id: p.ulpin,
      title: p.ulpin,
      status: p.title_status ? p.title_status.replace(/_/g, ' ') : 'VERIFIED',
      tag: "Nominee Endorsed",
      surveyNumber: p.survey_number,
      areaSqm: p.area_sqm,
      designatedNominee: nom.name,
      relation: nom.relationship,
      endorsedShare: nom.share_percent ? `${nom.share_percent}%` : "100%",
      statusNote: nom.status ? `${nom.status} (Owner Active)` : "Dormant (Owner Active)",
      primaryOwner: p.current_owner,
      canIssueKey: false
    };
  });

export const ALL_PENDING_TRANSFERS = pendingTransfersData;
