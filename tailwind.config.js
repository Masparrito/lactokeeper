/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // --- Colores base existentes (INTACTOS) ---
        'brand-dark': '#1C1C1E',
        'brand-light-gray': 'rgba(255, 255, 255, 0.7)',
        'brand-medium-gray': 'rgba(255, 255, 255, 0.4)',
        'brand-border': 'rgba(255, 255, 255, 0.2)',
        'brand-glass': 'rgba(255, 255, 255, 0.1)',
        'brand-amber': '#FBBF24', // Amarillo/Ámbar para confirmaciones y guardado

        // --- NUEVA PALETA DE COLORES REFINADA (ESTILO IOS) ---
        'brand-orange': '#FF9500', // Naranja vibrante para acciones primarias (ej: Siguiente, Añadir)
        'brand-green': '#34C759',  // Verde para estados positivos y de éxito final
        'brand-red': '#FF3B30',    // Rojo para acciones destructivas (eliminar, borrar)
        'brand-blue': '#007AFF',   // Azul para acciones informativas o secundarias
        'ios-modal-bg': '#2C2C2E', // Un gris oscuro profundo para los fondos de los modales

        // --- ADICIONES EXCLUSIVAS PARA EL DASHBOARD DE REBAÑO ---
        'dashboard-surface': 'rgba(44, 44, 46, 0.7)', // Un "glass" más oscuro y sutil para tarjetas y módulos
        'dashboard-surface-hover': 'rgba(58, 58, 60, 0.9)', // Efecto al pasar el mouse

        // --- TOKENS SEMÁNTICOS PARA TEMAS (claro/oscuro) ---
        // Por defecto valen el look OSCURO actual; .theme-light los invierte.
        // Definidos como canales RGB para soportar el modificador de opacidad
        // de Tailwind (ej. bg-c-bg/95). Ver src/index.css.
        'c-bg':            'rgb(var(--c-bg) / <alpha-value>)',
        'c-surface':       'rgb(var(--c-surface) / <alpha-value>)',
        'c-surface-2':     'rgb(var(--c-surface-2) / <alpha-value>)',
        'c-surface-3':     'rgb(var(--c-surface-3) / <alpha-value>)',
        'c-text':          'rgb(var(--c-text) / <alpha-value>)',
        'c-text-strong':   'rgb(var(--c-text-strong) / <alpha-value>)',
        'c-text-muted':    'rgb(var(--c-text-muted) / <alpha-value>)',
        'c-text-faint':    'rgb(var(--c-text-faint) / <alpha-value>)',
        'c-border':        'rgb(var(--c-border) / <alpha-value>)',
        'c-border-strong': 'rgb(var(--c-border-strong) / <alpha-value>)',
      }
    },
  },
  plugins: [],
}