export async function saleApi(path = '', data) {
  return activityApi(`/api/sales${path}`, data);
}

export async function activityApi(path, data, method) {
  const response = await fetch(path, {
    method: method || (data === undefined ? 'GET' : 'POST'), credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({ detail: 'Server unavailable. Please try again.' }));
  if (!response.ok) {
    const detail = Array.isArray(body.detail) ? body.detail.map((item) => `${item.loc.at(-1)}: ${item.msg}`).join('. ') : body.detail?.message || body.detail;
    throw new Error(typeof detail === 'string' ? detail : 'Please check the request fields');
  }
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
