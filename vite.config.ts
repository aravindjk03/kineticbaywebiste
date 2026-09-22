import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API is the real Cloudflare Worker (`npm run dev:api`, port 8787),
// so local testing exercises exactly the code that ships.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react-router-dom', 'framer-motion', '@react-three/fiber', '@react-three/drei', 'three'],
  },
});
