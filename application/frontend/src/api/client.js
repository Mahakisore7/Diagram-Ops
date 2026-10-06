import axios from 'axios';

const TOKEN_KEY = 'diagramops_token';

// Fired when the server rejects our token (expired or revoked). AuthContext
// listens for it to clear the session and tell the user, instead of every
// page discovering a dead session through its own failed request.
export const SESSION_EXPIRED_EVENT = 'diagramforge:session-expired';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked (private mode) - session lasts for this tab only */
  }
}

// baseURL is deliberately empty — every call below is a relative /api/...
// path. nginx proxies it in Docker/production, Vite's dev server proxies
// it locally (see vite.config.js). Same code, no VITE_API_URL, no CORS.
// See docs/adr/0007-nginx-api-proxy.md.
const client = axios.create({ baseURL: '', timeout: 30000 });

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Every backend error response shares one envelope shape (functional-spec
// §6): { error: { code, message, requestId } }. Unwrapping it here means
// every page just does `catch (err) { setError(err.message) }` instead of
// re-deriving this shape in every component.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // A 401 on login itself just means wrong credentials, not an expired
    // session - only a 401 while a token was attached ends the session.
    if (status === 401 && error.config?.headers?.Authorization) {
      setToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const apiError = error.response?.data?.error;
    return Promise.reject({
      status,
      code: apiError?.code || 'NETWORK_ERROR',
      message:
        apiError?.message || 'Could not reach the server. Check your connection and try again.',
      requestId: apiError?.requestId,
    });
  },
);

export default client;
