module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* U-Axis Brand Scale — Soft Indigo / Royal Blue */
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6875F5',
          600: '#545FDB',
          700: '#434EB8',
          800: '#353D94',
          900: '#292E70',
          950: '#1E2356',
          DEFAULT: '#6875F5',
        },
        /* Semantic surfaces (U-Axis Dark UI) */
        background: '#0F1117',
        surface: {
          DEFAULT: '#1A1D27',
          secondary: '#1F2330',
          elevated: '#242938',
          hover: '#222634',
          active: '#292E40',
        },
        /* Semantic borders (U-Axis) */
        border: {
          DEFAULT: '#25293A',
          subtle: 'rgba(255, 255, 255, 0.06)',
          strong: '#33394D',
        },
        default: '#25293A',
        /* Semantic text (U-Axis Dark UI) */
        foreground: '#F3F4F8',
        secondary: '#9DA4B7',
        muted: '#6D758B',
        /* Semantic accent + states */
        accent: {
          DEFAULT: '#6875F5',
          hover: '#7B85F8',
          active: '#5863D8',
          light: '#545FDB',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          ink: '#B91C1C',
        },
        warning: {
          DEFAULT: '#F59E0B',
          ink: '#D97706',
        },
        success: {
          DEFAULT: '#10B981',
          ink: '#059669',
        },
        info: {
          DEFAULT: '#6875F5',
          ink: '#434EB8',
        },
        /* Neutral scale mapped to U-Axis light and dark tokens */
        gray: {
          50: '#F7F8FA',
          100: '#F1F3F7',
          200: '#E2E5EC',
          300: '#CBD1DC',
          400: '#9BA3B5',
          500: '#697287',
          600: '#4E5569',
          700: '#33394D',
          800: '#1F2330',
          900: '#111625',
          950: '#0F1117',
        },
        /* Legacy slate aliases kept for compatibility */
        slate: {
          850: '#1A1D27',
          900: '#0F1117',
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
