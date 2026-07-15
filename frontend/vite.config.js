import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // see src/shims/emotionServerStub.js
      '@emotion/server/create-instance': fileURLToPath(
        new URL('./src/shims/emotionServerStub.js', import.meta.url),
      ),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
