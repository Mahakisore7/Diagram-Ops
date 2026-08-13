import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import client, { getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true whenever a token is already on disk, so a page refresh
  // shows a loading state instead of flashing the login page for a split
  // second before /api/auth/me resolves.
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (email, password) => {
    await client.post('/api/auth/register', { email, password });
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Exporting the hook alongside the provider (rather than a separate
// useAuth.js) costs a slightly coarser Fast Refresh boundary — editing
// this file remounts the whole tree instead of hot-swapping just the
// hook. Worth it here: the two are one concept, and splitting a
// two-function file for a dev-server nicety isn't a good trade.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
