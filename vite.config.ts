import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Configuración del Manifest de la PWA
      manifest: {
        name: 'LactoKeeper',
        short_name: 'LactoKeeper',
        description: 'Gestión profesional de rebaños caprinos, offline-first.',
        theme_color: '#1C1C1E', // Color de la barra de herramientas
        background_color: '#1C1C1E', // Color de la pantalla de bienvenida
        display: 'standalone', // Esto hace que parezca una app nativa
        scope: '.',
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
            purpose: 'any maskable' // Ícono adaptable para diferentes formas
          }
        ]
      }
    })
  ],
})