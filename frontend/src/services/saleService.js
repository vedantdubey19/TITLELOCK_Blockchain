export async function saleApi(path = '', data) {
  return activityApi(`/api/sales${path}`, data);
}

export async function activityApi(path, data) {
  const response = await fetch(path, {
    method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({ detail: 'Server unavailable. Please try again.' }));
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Please check the request fields');
  return body;
}

export const saleEventLabel = (action) => ({
  SALE_REQUESTED: 'Registrar created the sale request',
  OWNER_KEY_ISSUED: 'Owner key issued',
  REGISTRAR_KEY_ISSUED: 'Registrar key issued',
  OWNER_APPROVED: 'Owner approval accepted',
  REGISTRAR_APPROVED: 'Registrar approval accepted',
  SALE_EXPIRED: 'Sale expired · seven-day cooldown started',
  TRANSFER_COMPLETED: 'Database ownership transferred',
  TRANSFER_FAILED: 'Transfer attempt failed',
  WALLET_APPROVED: 'Participant signed the wallet approval',
  BLOCKCHAIN_PREPARED: 'All approvals verified · ready for registrar wallet transaction',
}[action] || action);
