import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useParams } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import RouteError from './components/layout/RouteError';
import { FullPageLoader, ProtectedRoute, PublicOnlyRoute } from './components/layout/RouteGuards';
import { Skeleton } from './components/ui/primitives';

// Every page is lazy-loaded into its own chunk (docs/adr/0011). Mermaid
// (~250KB gzipped) is only pulled in by pages that render diagrams, so the
// landing and auth pages never download it.
// The signed-in shell (sidebar, command palette) is its own chunk too, so
// landing-page visitors never download it.
const AppShell = lazy(() => import('./components/layout/AppShell'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudioPage = lazy(() => import('./pages/StudioPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SharedDiagramPage = lazy(() => import('./pages/SharedDiagramPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

// Old Phase-1 URLs keep working for anyone with bookmarks.
function LegacyDiagramRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/diagrams/${id}`} replace />;
}

function Root() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Outlet />
    </Suspense>
  );
}

function AppPages() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/s/:token', element: <SharedDiagramPage /> },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/app',
            element: <AppShell />,
            children: [
              {
                element: <AppPages />,
                errorElement: <RouteError />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'new', element: <StudioPage /> },
                  { path: 'diagrams', element: <LibraryPage /> },
                  { path: 'diagrams/:id', element: <EditorPage /> },
                  { path: 'activity', element: <ActivityPage /> },
                  { path: 'settings', element: <Navigate to="/app/settings/profile" replace /> },
                  { path: 'settings/:tab', element: <SettingsPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '/diagrams', element: <Navigate to="/app/diagrams" replace /> },
      { path: '/diagrams/:id', element: <LegacyDiagramRedirect /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return (
    // reducedMotion="user": every motion animation honours the OS
    // "reduce motion" accessibility setting automatically.
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
