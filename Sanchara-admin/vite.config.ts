import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Sanchara clinical portal (admin web app).
// Tailwind v4 is wired via its Vite plugin — there is no tailwind.config.js;
// the design tokens live in src/index.css under @theme.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // import.meta.dirname (not __dirname) — required by Vite's native config loader.
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  server: {
    port: 5173,
    // Proxy keeps the browser same-origin in dev, so the backend needs no CORS
    // changes. Production builds talk to VITE_API_URL directly.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
