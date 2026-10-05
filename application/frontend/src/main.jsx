import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts: no request to a third-party font CDN, so the
// CSP can stay at font-src 'self' and no visitor IPs leak to Google.
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
