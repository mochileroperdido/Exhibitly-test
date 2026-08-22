import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Exhibly Kiosk',
        short_name: 'Exhibly',
        description: 'Interactive 3D product kiosk',
        theme_color: '#f2f1ee',
        background_color: '#f2f1ee',
        display: 'fullscreen',
        orientation: 'any',
        icons: [],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 150 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,glb,mp4}'],
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*\.glb$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'model-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/media\/.*\.(mp4|jpg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
              // Videos are served with range requests; let workbox honor them.
              rangeRequests: true,
            },
          },
        ],
      },
    }),
  ],
})
