import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// No VITE_API_URL anywhere in this file or the app — see
// docs/adr/0007-nginx-api-proxy.md. The frontend always calls a relative
// /api path; this proxy makes `npm run dev` behave identically to nginx's
// proxy in Docker/production, so there is exactly one code path, not one
// per environment.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: their hashes only change when the
        // dependency version changes, so returning users keep them cached
        // across app deploys instead of re-downloading React every release.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'scheduler', 'react-router-dom'],
          motion: ['motion/react'],
          http: ['axios'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
