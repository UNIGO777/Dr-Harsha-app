import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Sanchara clinical portal (admin web app).
// Tailwind v4 is wired via its Vite plugin — there is no tailwind.config.js;
// the design tokens live in src/index.css under @theme.
export default defineConfig(({ mode }) => {
  // Vite does NOT populate process.env from .env files — config code must load
  // them explicitly. (Reading process.env.VITE_API_PROXY directly silently
  // falls back to the default, which on macOS lands on AirPlay's port 5000 and
  // returns an opaque 403.)
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Default matches PORT in Sanchara-backend/backend/.env. Port 5000 is
  // deliberately avoided: macOS AirPlay Receiver squats on it.
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:5055';

  // Printed on startup so a misrouted proxy is obvious immediately.
  console.log(`[sanchara-admin] proxying /api → ${apiTarget}`);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // import.meta.url (not __dirname) — required by Vite's native config loader.
      alias: { '@': new URL('./src', import.meta.url).pathname },
    },
    server: {
      port: 5173,
      // Proxy keeps the browser same-origin in dev, so the backend needs no CORS
      // changes. Production builds talk to VITE_API_URL directly.
      //
      // /media must be proxied too: video.service resolves playable URLs to
      // /media/... and without this Vite's SPA fallback answers with index.html
      // (HTTP 200, text/html), so <video> fails silently instead of 404ing.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/media': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
