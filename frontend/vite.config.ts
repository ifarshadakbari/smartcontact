import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {createApiMiddleware} from './devApiMiddleware';

export default defineConfig(() => {
  return {
    base: process.env.VITE_BASE_PATH || './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dev-api-server',
        configureServer(server) {
          // Allow accessing the app under both / and /webapp/smartcontact/ in dev mode
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/webapp/smartcontact') && !req.url.startsWith('/webapp/smartcontact/api')) {
              req.url = req.url.replace(/^\/webapp\/smartcontact/, '') || '/';
            }
            next();
          });
          server.middlewares.use(createApiMiddleware());
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
