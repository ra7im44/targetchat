module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Brand accent scale (teal). Replaces the old indigo `primary` scale so
           existing primary-* classes migrate automatically. */
        primary: {
          50: '#effdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
          DEFAULT: '#2dd4bf',
        },
        /* Semantic surfaces (dark UI) */
        background: '#0B1114',
        surface: {
          DEFAULT: '#111A1F',
          elevated: '#172329',
          hover: '#1C2A31',
        },
        /* Semantic borders */
        border: {
          DEFAULT: '#293940',
          strong: '#344750',
        },
        default: '#293940',
        /* Semantic text (dark UI) */
        foreground: '#F2F6F7',
        secondary: '#B0BDC2',
        muted: '#7F9097',
        /* Semantic accent + states */
        accent: {
          DEFAULT: '#2DD4BF',
          hover: '#20BFAA',
          active: '#149D8C',
        },
        danger: {
          DEFAULT: '#EF6464',
          hover: '#DC5050',
          ink: '#C43D3D',
        },
        warning: {
          DEFAULT: '#EAB85C',
          ink: '#8A5A00',
        },
        success: {
          DEFAULT: '#58C98D',
          ink: '#0E7A4D',
        },
        info: {
          DEFAULT: '#63A7D8',
          ink: '#2577B8',
        },
        /* Legacy slate-850 alias kept for unmigrated files (do not use in new code) */
        slate: {
          850: '#1e293b',
          900: '#0f172a',
        },
      },
      borderRadius: {
        card: '10px',
        modal: '12px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
