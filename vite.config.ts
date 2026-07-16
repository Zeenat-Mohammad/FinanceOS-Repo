import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'FinancialOS',
        short_name: 'FinancialOS',
        description: 'Your personal financial operating system',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone'
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'financialos-runtime',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173
  }
});

