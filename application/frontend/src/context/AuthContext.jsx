import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken, SESSION_EXPIRED_EVENT } from '../api/client';
import { authApi } from '../api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  // Starts true whenever a token is already on disk, so a page refresh
  // shows a loading state instead of flashing the login page for a split
  // second before /api/auth/me resolves.
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // The API client fires this when a request with a token comes back 401.
  // Only toast if someone was actually signed in - a stale token found at
  // boot expiring is not news to the user.
  useEffect(() => {
    function onExpired() {
      if (user) toast.warning('Session expired', 'Please sign in again to continue.');
      setUser(null);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toast, user]);

  const login = useCallback(async (email, password) => {
    const { token, user: signedIn } = await authApi.login(email, password);
    setToken(token);
    setUser(signedIn);
    return signedIn;
  }, []);

  // Register (FR-A1) and login (FR-A2) are separate endpoints — the backend
  // deliberately doesn't return a token on registration, so this chains
  // straight into a login for a one-step signup.
  const register = useCallback(
    async (email, password, name) => {
      await authApi.register(email, password, name);
      return login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Exporting the hook alongside the provider (rather than a separate
// useAuth.js) costs a slightly coarser Fast Refresh boundary. Worth it: the
// two are one concept.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
