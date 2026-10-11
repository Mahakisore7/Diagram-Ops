import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts: no request to a third-party font CDN, so the CSP can
// stay at font-src 'self' and no visitor IPs leak to Google.
//   Geist            - UI text
//   Geist Mono       - technical labels, code, figure numbers
//   Instrument Serif - editorial display headings
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
