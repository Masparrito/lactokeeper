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
      // --- LÍNEA CORREGIDA: Se elimina la propiedad 'registerType' que causa el error de tipo ---
      // La PWA usará el valor por defecto ('prompt') que es seguro y funcional.
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