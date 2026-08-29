import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: the SPA calls /api/* and Vite forwards to the Express backend,
// so the browser sees one origin (no CORS) in development.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
