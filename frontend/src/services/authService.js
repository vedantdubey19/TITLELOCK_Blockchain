async function request(path, data) {
  let response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again.');
  }
  const body = response.status === 204 ? null : await response.json().catch(() => ({ detail: 'Server unavailable. Please try again.' }));
  if (!response.ok) {
    const detail = Array.isArray(body.detail)
      ? body.detail.map((error) => error.msg).join('. ')
      : body.detail?.message || body.detail;
    const error = new Error(detail || 'Request failed');
    error.status = response.status;
    error.code = body.detail?.code;
    throw error;
  }
  return body;
}

export const authService = {
  me: () => request('me'),
  login: (identifier, password, expectedRole) => request('login', { identifier, password, expectedRole }),
  signup: (data) => request('signup', data),
  verifyOTP: (data) => request('otp/verify', data),
  logout: () => request('logout', {}),
};
