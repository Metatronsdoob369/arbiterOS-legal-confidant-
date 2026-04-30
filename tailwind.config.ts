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
        // Mahogany / leather / gold palette
        mahogany: {
          50:  '#f9f3ee',
          100: '#f0e4d6',
          200: '#d9c2a6',
          300: '#c2a076',
          400: '#a87d4d',
          500: '#8b5e30',
          600: '#6e4220',
          700: '#5a3415',
          800: '#3d2b1f',  // sidebar border
          900: '#2a1c12',  // deep sidebar
          950: '#150d08',  // darkest mahogany
        },
        leather: {
          50:  '#fdf6ee',
          100: '#f7e8d0',
          200: '#eece9b',
          300: '#e8dcc8',  // body text
          400: '#c2a882',
          500: '#9a7d56',
          600: '#7a6040',
          700: '#5a4030',  // muted text
          800: '#3d2b1f',
          900: '#1e1410',  // sidebar bg
          950: '#0d0806',  // page bg
        },
        gold: {
          50:  '#fffde7',
          100: '#fff9c4',
          200: '#fff176',
          300: '#ffd700',  // gold accent
          400: '#ffc107',
          500: '#d4af37',  // primary gold
          600: '#b8941e',  // dark gold
          700: '#9a7b10',
          800: '#7d6308',
          900: '#5c4a06',
        },
      },
      fontFamily: {
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Merriweather"', 'Georgia', 'serif'],
      },
      boxShadow: {
        sidebar:     '4px 0 20px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 20px rgba(212,175,55,0.5), 0 0 40px rgba(255,200,100,0.2)',
        'gold-soft': '0 0 15px rgba(212,175,55,0.25)',
        'panel':     '0 4px 24px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        panel: '0.5rem',
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #1e1410 0%, #150d08 100%)',
        'main-gradient':    'linear-gradient(180deg, #0d0806 0%, #0a0604 100%)',
        'gold-gradient':    'linear-gradient(135deg, #d4af37, #b8941e)',
        'gold-lit':         'linear-gradient(135deg, #d4af37, #ffd700)',
        'nav-active':       'linear-gradient(135deg, #d4af37, #b8941e)',
        'logo-dark':        'linear-gradient(135deg, #3d2b1f, #2a1c12)',
      },
    },
  },
  plugins: [],
} satisfies Config

