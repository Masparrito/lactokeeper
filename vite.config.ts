// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: el nuevo Service Worker toma control de inmediato (skipWaiting
      // + clientsClaim), así el usuario recibe las actualizaciones sin tener que
      // reinstalar la app.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // El bundle principal pesa ~3.4 MB y supera el limite por defecto (2 MB);
        // subimos el tope para que TODO el app-shell quede precacheado y la app
        // cargue 100% offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // SPA: cualquier navegacion offline cae en index.html (la app maneja el
        // resto de la navegacion internamente con estado, no por rutas de URL).
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'GanaderoOS',
        short_name: 'GanaderoOS',
        description: 'El sistema operativo para la gestión ganadera, offline-first.',
        theme_color: '#09090b',
        background_color: '#1C1C1E',
        // standalone: coincide con apple-mobile-web-app-capable; NO usar
        // 'fullscreen' para no alterar el manejo de safe-areas en iOS.
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
