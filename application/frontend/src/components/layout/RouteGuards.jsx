import { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogoMark } from '../brand/Logo';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-950">
      <LogoMark className="size-10 animate-pulse" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

// Signed-out users are sent to /login, remembering where they were headed
// so the login page can send them straight back afterwards.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Login and signup make no sense for someone who ARRIVES already signed in.
// The decision is taken once, when auth finishes loading: someone who signs
// in on this page must not be bounced to /app by this guard, because the
// page itself redirects them (to /app/new after signup, or back to the page
// that sent them to /login) - redirecting here too races that and wins.
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  const arrivedSignedIn = useRef(null);
  if (!loading && arrivedSignedIn.current === null) arrivedSignedIn.current = Boolean(user);

  if (loading) return <FullPageLoader />;
  if (arrivedSignedIn.current && user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
