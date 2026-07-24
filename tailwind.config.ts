import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0c',
          soft: '#14171c',
        },
        gunmetal: {
          DEFAULT: '#2a2e35',
          deep: '#1c2026',
          lit: '#343a44',
        },
        silver: {
          DEFAULT: '#cfd5de',
          bright: '#eef1f5',
          den: '#9aa1ab',
        },
        champagne: {
          DEFAULT: '#c4a574',
          soft: 'rgba(196,165,116,0.12)',
        },
        // Legacy aliases → brand kit (keeps older classnames from breaking hard)
        mahogany: {
          50: '#f4f5f7',
          100: '#e8eaee',
          200: '#cfd5de',
          300: '#9aa1ab',
          400: '#6b7280',
          500: '#4b5563',
          600: '#343a44',
          700: '#2a2e35',
          800: '#1c2026',
          900: '#14171c',
          950: '#0a0a0c',
        },
        leather: {
          50: '#f4f5f7',
          100: '#e8eaee',
          200: '#cfd5de',
          300: '#eef1f5',
          400: '#cfd5de',
          500: '#9aa1ab',
          600: '#6b7280',
          700: '#9aa1ab',
          800: '#1c2026',
          900: '#14171c',
          950: '#0a0a0c',
        },
        gold: {
          50: '#faf6ef',
          100: '#f0e6d4',
          200: '#e0c9a0',
          300: '#d4b687',
          400: '#c4a574',
          500: '#c4a574',
          600: '#a8894f',
          700: '#8a7040',
          800: '#6b5632',
          900: '#4a3b22',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        serif: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sidebar: '4px 0 24px rgba(0,0,0,0.45)',
        panel: '0 12px 40px rgba(0,0,0,0.4)',
        'silver-soft': '0 0 18px rgba(207,213,222,0.12)',
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #1c2026 0%, #0a0a0c 100%)',
        'main-gradient': 'linear-gradient(180deg, #0f1216 0%, #0a0a0c 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
