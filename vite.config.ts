// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Esta línea es la solución.
  // Fuerza a Vite a usar rutas relativas (./) en lugar de absolutas (/).
  base: './', 
  
  plugins: [react()],
})