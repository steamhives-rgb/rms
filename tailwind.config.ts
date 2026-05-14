import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── STEAMhives Brand ────────────────────────────────────
        brand: {
          navy:   '#050d1a',   // primary
          orange: '#fb923c',   // accent
          // Shades derived from navy
          950: '#050d1a',
          900: '#081425',
          800: '#0d2040',
          700: '#122c5a',
          600: '#183a78',
          // Shades derived from orange
          accent: {
            DEFAULT: '#fb923c',
            light:   '#fdba74',
            dark:    '#ea6b12',
          },
        },
        // ── Semantic aliases ────────────────────────────────────
        primary: {
          DEFAULT: '#050d1a',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#fb923c',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'var(--font-montserrat)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      spacing: {
        'topbar':  '60px',   // desktop topbar height
        'topbar-m': '50px',  // mobile topbar height
        'sidebar': '240px',  // sidebar width
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 8px 0 rgba(5,13,26,0.08)',
        'card-lg': '0 4px 24px 0 rgba(5,13,26,0.12)',
        'inner-brand': 'inset 0 0 0 2px #fb923c',
      },
      animation: {
        'fade-up': 'fadeUp 0.2s ease-out forwards',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
        'slide-in': 'slideIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      screens: {
        'xs': '375px',    // minimum supported mobile width
      },
    },
  },
  plugins: [],
};

export default config;
