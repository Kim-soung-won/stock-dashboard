import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const BFF_ORIGIN = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: BFF_ORIGIN, changeOrigin: true },
      '/ws': { target: BFF_ORIGIN, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
