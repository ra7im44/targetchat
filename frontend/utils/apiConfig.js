// Single source of truth for backend origin + auth/socket helpers.
// NEXT_PUBLIC_API_URL may be set as origin (http://host:3001) or with a
// trailing /api and/or trailing slash — normalize to the origin so that
// REST (`${API_URL}/api/...`) and Socket.io (`io(SOCKET_URL)`) agree.
function normalizeOrigin(raw) {
  const fallback = 'http://localhost:3001';
  let base = (raw || fallback).trim() || fallback;
  base = base.replace(/\/+$/, '');
  if (/\/api$/i.test(base)) base = base.slice(0, -4);
  return base.replace(/\/+$/, '');
}

export const API_URL = normalizeOrigin(
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined
);

// Socket.io mounts on the origin root, never under /api.
export const SOCKET_URL = API_URL;

export const api = (path) => {
  const p = String(path || '');
  return `${API_URL}/api${p.startsWith('/') ? p : `/${p}`}`;
};

export function getToken() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('tc_token');
  } catch (e) {
    return null;
  }
}

export function authHeaders(extra) {
  const token = getToken();
  return Object.assign(
    {},
    extra || {},
    token ? { Authorization: `Bearer ${token}` } : {}
  );
}

export function clearSession() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('tc_token');
    window.localStorage.removeItem('tc_user');
  } catch (e) {}
}

export function redirectToLogin(router) {
  clearSession();
  try {
    if (router && typeof router.replace === 'function') router.replace('/login');
    else if (typeof window !== 'undefined') window.location.assign('/login');
  } catch (e) {}
}

export function isAuthError(status) {
  return status === 401 || status === 403;
}

// Authenticated fetch against `${API_URL}/api${path}`.
// - injects Bearer token, JSON content-type by default
// - returns raw Response so callers keep control; use apiFetchJson for parsed body
export async function apiFetch(path, options) {
  const opts = Object.assign({}, options || {});
  opts.headers = authHeaders(opts.headers);
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
    if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
  }
  return fetch(api(path), opts);
}

export async function apiFetchJson(path, options) {
  const res = await apiFetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { res, data };
}
