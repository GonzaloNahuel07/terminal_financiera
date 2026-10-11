/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fey: {
          ink: '#0b0b0b',
          charcoal: '#191919',
          obsidian: '#131313',
          graphite: '#868f97',
          mist: '#cccccc',
          smoke: '#525252',
          pale: '#e6e6e6',
          ash: '#999999',
          signal: '#479ffa',
          growth: '#4ebe96',
          ember: '#ffa16c',
          abyss: '#000000',
        }
      },
      letterSpacing: {
        'fey-display': '-0.08em',
        'fey-heading': '-0.053em',
      },
      boxShadow: {
        'fey-halo': '0px 0px 44px 0px rgba(0, 0, 0, 0.85)',
        'fey-card': '0px 0px 44px 0px rgba(0, 0, 0, 0.9), inset 0px 1px 0px 0px rgba(255, 255, 255, 0.05)',
        'fey-button': '0px 1px 0px 0px rgba(0, 0, 0, 0.85), 0px 0px 14px 0px rgba(255, 255, 255, 0.22)',
        'fey-ember-glow': '0px 0px 24px 0px rgba(255, 161, 108, 0.2)',
        'fey-growth-glow': '0px 0px 24px 0px rgba(78, 190, 150, 0.2)',
      },
      borderRadius: {
        'fey-card': '16px',
        'fey-pill': '99px',
        'fey-featured': '275px',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.08)' },
          '66%': { transform: 'translate(-25px, 20px) scale(0.95)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(-35px, 30px) scale(1.05)' },
          '66%': { transform: 'translate(20px, -35px) scale(0.92)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.22', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(1.12)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      animation: {
        'float-slow': 'float-slow 22s ease-in-out infinite',
        'float-delayed': 'float-delayed 28s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 14s ease-in-out infinite',
        'shimmer': 'shimmer 8s linear infinite',
      }
    },
  },
  plugins: [],
}
