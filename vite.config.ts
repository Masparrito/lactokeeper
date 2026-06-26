// vite.config.ts (Corregido)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', 
  plugins: [
    react(),
    VitePWA({
      // NOTA: vite-plugin-pwa esta fijado en 0.2.1 (version muy antigua) y NO
      // genera Service Worker en el build. La app se instala en iOS via las
      // meta tags de apple-* y funciona offline gracias a IndexedDB (Dexie),
      // pero no hay cache de app-shell por SW. Pendiente: actualizar el plugin.
      manifest: {
        name: 'GanaderoOS',
        short_name: 'GanaderoOS',
        description: 'El sistema operativo para la gestión ganadera, offline-first.',
        theme_color: '#1C1C1E', 
        background_color: '#1C1C1E', 
        display: 'fullscreen', // <-- ¡CAMBIO REALIZADO!
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