/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#080909',
        'dark-surface': '#111313',
        'dark-elevated': '#1A1D1F',
        'dark-border': '#2A2D30',
        'accent-amber': '#FF9000',
        'accent-lime': '#C7F700',
        'accent-red': '#FF3B3B',
        'accent-green': '#00D966',
        'text-primary': '#F3EFE4',
        'text-secondary': '#B8B3A8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
