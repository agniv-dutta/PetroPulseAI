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
        'text-dim': '#6B6860',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'pulse-red': 'pulse-red 1.2s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
        'telemetry-fill': 'telemetry-fill 1.5s ease-out forwards',
        'blink': 'blink 1s step-end infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        'pulse-amber': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(255,144,0,0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 8px 2px rgba(255,144,0,0.15)' },
        },
        'pulse-green': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'pulse-red': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(255,59,59,0.4)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 12px 4px rgba(255,59,59,0.15)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'telemetry-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--fill-width, 50%)' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'telemetry': 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
        'card': '0 1px 3px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
