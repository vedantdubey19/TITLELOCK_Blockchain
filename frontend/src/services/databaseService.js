export function normalizeProperty(raw) {
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
    registrationOffice: raw.registration_office || 'Not recorded',
    lastRegisteredDate: raw.last_registered_date,
    titleStatus: raw.title_status,
    status: raw.title_status ? raw.title_status.replace(/_/g, ' ') : 'Not recorded',
    riskStatus: raw.risk_status,
    statusVariant,
    healthScore: null,
    boundary: raw.boundary || [],
    transferHistory: raw.transfer_history || [],
    deedHash: lastHistory?.doc_hash || null,
    blockchainTx: lastHistory?.tx_hash || null,
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
