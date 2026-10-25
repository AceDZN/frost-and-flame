import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5232, strictPort: true },
  preview: { host: '127.0.0.1', port: 4232, strictPort: true },
  build: { chunkSizeWarningLimit: 900, assetsInlineLimit: 0 },
});
