import axios from 'axios';

const TOKEN_KEY = 'diagramops_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
// re-deriving this shape in five different components.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
    }
    const apiError = error.response?.data?.error;
    return Promise.reject({
      status: error.response?.status,
      code: apiError?.code || 'NETWORK_ERROR',
      message: apiError?.message || 'Could not reach the server. Check your connection and try again.',
      requestId: apiError?.requestId,
    });
  },
);

export default client;
