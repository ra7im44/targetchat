module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Semantic surfaces powered by CSS variables */
        background: 'var(--bg-base)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          secondary: 'var(--bg-elevated)',
          elevated: 'var(--bg-elevated)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-hover)',
        },
        /* Semantic borders */
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        default: 'var(--border)',
        /* Semantic typography */
        foreground: 'var(--text-primary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        /* Brand primary & accent */
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          foreground: 'var(--primary-foreground)',
          subtle: 'var(--primary-subtle)',
        },
        accent: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          light: 'var(--primary-subtle)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          hover: '#DC2626',
          ink: 'var(--danger)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          ink: 'var(--warning)',
        },
        success: {
          DEFAULT: 'var(--success)',
          ink: 'var(--success)',
        },
        info: {
          DEFAULT: 'var(--info)',
          ink: 'var(--info)',
        },
        /* Neutral Slate/Gray scale */
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        slate: {
          850: '#1E293B',
          900: '#0F172A',
        },
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
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
