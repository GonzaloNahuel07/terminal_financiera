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
          ink: '#08090c',        // Nocturnal Gotham & Spider Obsidian Canvas
          charcoal: '#13161f',   // Tactical Wayne Tech armor surface
          obsidian: '#0e1017',   // Deep tertiary surface
          graphite: '#7e889b',   // Stealth graphite
          mist: '#c7d0dc',       // Titanium mist
          smoke: '#3f4756',      // Dark stealth dividers
          pale: '#e2e8f0',       // Light neutral
          ash: '#94a3b8',        // Secondary mid-gray
          signal: '#38bdf8',     // Spider Cobalt / Web-Shooter HUD Blue
          growth: '#10b981',     // Bio-Venom / Tactical Green
          ember: '#f43f5e',      // Spider Crimson / High-Voltage Red
          gold: '#f59e0b',       // Wayne Tech / Bat-Signal Tactical Gold
          abyss: '#040507',
        },
        batman: {
          gold: '#f59e0b',
          amber: '#d97706',
          armor: '#141722',
          stealth: '#0a0c10',
          titanium: '#242b38',
        },
        spider: {
          crimson: '#f43f5e',
          red: '#ef4444',
          cobalt: '#2563eb',
          electric: '#38bdf8',
          venom: '#facc15',
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
        'fey-ember-glow': '0px 0px 24px 0px rgba(244, 63, 94, 0.28)',
        'fey-growth-glow': '0px 0px 24px 0px rgba(16, 185, 129, 0.22)',
        'fey-batman-glow': '0px 0px 24px 0px rgba(245, 158, 11, 0.25)',
        'fey-spider-glow': '0px 0px 24px 0px rgba(244, 63, 94, 0.3)',
        'fey-cobalt-glow': '0px 0px 24px 0px rgba(56, 189, 248, 0.25)',
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
