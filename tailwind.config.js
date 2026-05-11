/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        budget: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          text: '#0F172A',
          muted: '#64748B',
          accent: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          border: '#E2E8F0'
        },
        invest: {
          bg: '#020617',
          panel: '#0F172A',
          card: '#111827',
          text: '#E2E8F0',
          muted: '#94A3B8',
          neon: '#00FF85',
          soft: '#4ADE80',
          bullish: '#22C55E',
          bearish: '#F43F5E',
          gold: '#FACC15',
          border: '#1E293B'
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
