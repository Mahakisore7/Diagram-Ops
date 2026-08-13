import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Lazy-loaded so each page becomes its own chunk. This matters most for
// GeneratePage and DiagramDetailPage: they're the only two that import
// MermaidRenderer, and mermaid alone accounts for roughly 250KB gzipped —
// see docs/adr/0011-lazy-loaded-routes.md. Without this, a first-time
// visitor would download mermaid's full weight just to see the login page,
// which never touches a diagram.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const GeneratePage = lazy(() => import('./pages/GeneratePage'));
const MyDiagramsPage = lazy(() => import('./pages/MyDiagramsPage'));
const DiagramDetailPage = lazy(() => import('./pages/DiagramDetailPage'));

function PageFallback() {
  return <div className="flex justify-center p-12 text-sm text-slate-400">Loading…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<GeneratePage />} />
                <Route path="/diagrams" element={<MyDiagramsPage />} />
                <Route path="/diagrams/:id" element={<DiagramDetailPage />} />
              </Route>
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
