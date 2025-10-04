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
        // --- Colores base existentes ---
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
      }
    },
  },
  plugins: [],
}