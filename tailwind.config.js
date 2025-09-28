/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Definimos la fuente 'Inter' como la fuente principal de la App.
      // Es muy similar a la fuente San Francisco que usa Apple.
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Definimos la paleta de colores inspirada en la App Clima.
      colors: {
        'brand-dark': '#1C1C1E',
        'brand-light-gray': 'rgba(255, 255, 255, 0.7)',
        'brand-medium-gray': 'rgba(255, 255, 255, 0.4)',
        'brand-border': 'rgba(255, 255, 255, 0.2)',
        'brand-glass': 'rgba(255, 255, 255, 0.1)',
        'brand-amber': '#FBBF24',
      }
    },
  },
  plugins: [],
}
