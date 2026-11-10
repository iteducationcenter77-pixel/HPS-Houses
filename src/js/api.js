// ============================================
// API client — talks to the site's own server (/api/rpc → MongoDB)
// ============================================

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Call a server action. Resolves with its data, or throws ApiError.
 * The admin session travels in an HttpOnly cookie, so nothing is stored here.
 */
export async function api(action, params = {}) {
  let res;
  try {
    res = await fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, params }),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  let body = null;
  try {
    body = await res.json();
  } catch { /* non-JSON response, handled below */ }

  if (!res.ok || !body || body.error) {
    // Session expired or was signed out elsewhere: let the admin page show the login form.
    if (res.status === 401 && !action.startsWith('auth.')) {
      window.dispatchEvent(new CustomEvent('hps:signed-out'));
    }
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return body.data;
}
