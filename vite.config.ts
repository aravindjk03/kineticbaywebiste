import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function securityServerPlugin(): Plugin {
  return {
    name: 'security-server-plugin',
    async configureServer(server) {
      const { createServerApp } = await import('./server/app.js');
      const { getActiveCmsRoute } = await import('./server/store.js');
      const apiApp = createServerApp();
      console.log(`[Vite Dev] Server-side security API mounted on /api`);
      console.log(`[Vite Dev] Active Obfuscated CMS Route: /${getActiveCmsRoute()}`);
      server.middlewares.use(apiApp);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), securityServerPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'react-router-dom',
      'framer-motion',
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      '@supabase/supabase-js',
    ],
  },
});
