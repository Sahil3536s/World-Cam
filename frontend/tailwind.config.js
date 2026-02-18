/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'slate-950': '#0B1220', // Custom dark theme background
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite', // For the floating 3D globe
        'pulse-glow': 'pulse-red 2s infinite', // For animated map markers
      },
      boxShadow: {
        'neon-red': '0 0 20px rgba(239, 68, 68, 0.4)', // Glowing red for cards
        'neon-blue': '0 0 30px rgba(59, 130, 246, 0.6)', // Glowing blue for the globe
      }
    },
  },
  plugins: [],
}