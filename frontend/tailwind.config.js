/* TargetChat design system — Tailwind configuration.
 *
 * ARCHITECTURE NOTES (read before editing):
 *
 * 1. Every semantic colour is declared as `rgb(var(--x-rgb) / <alpha-value>)`.
 *    The `-rgb` variables hold space-separated channels (e.g. `91 91 214`).
 *    This is REQUIRED for opacity modifiers to work: Tailwind 3 can only build
 *    `bg-primary/10` from a channel-based value. With a hex-backed var the
 *    generated declaration is invalid and Tailwind silently DROPS the rule —
 *    which is what previously removed every `ring-primary/20` focus ring and
 *    every `/10` soft tint (486 usages) from the compiled stylesheet.
 *
 * 2. `text-primary` means BRAND primary (indigo), not "primary body text".
 *    Body copy uses `text-foreground`; supporting copy `text-secondary`;
 *    de-emphasised copy `text-muted`. Do not rely on `text-primary` for text.
 *
 * 3. The neutral ramp (`gray` / `slate`) is theme-aware: low steps are
 *    surfaces and borders, high steps are ink, and the whole ramp inverts in
 *    dark mode. `text-gray-500` is therefore readable in BOTH themes, so
 *    legacy markup no longer needs a hand-written `dark:` counterpart.
 *
 * 4. Elevation is a named scale, not ad-hoc. `shadow-xs` and `shadow-2xs`
 *    did not exist in Tailwind 3 and rendered nothing.
 */
module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },

      /* ---------------- Colour system ---------------- */
      colors: {
        /* Surfaces */
        background: 'rgb(var(--bg-base-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated-rgb) / <alpha-value>)',
          hover: 'rgb(var(--bg-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--bg-hover-rgb) / <alpha-value>)',
        },

        /* Borders */
        border: {
          DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
          strong: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        },
        default: 'rgb(var(--border-rgb) / <alpha-value>)',

        /* Typography */
        foreground: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',

        /* Brand */
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
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--primary-active-rgb) / <alpha-value>)',
          soft: 'rgb(var(--primary-soft-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
        },

        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--accent-active-rgb) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
          light: 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground-rgb) / <alpha-value>)',
        },

        /* Status.
           `ink`        = readable text ON the `soft` fill (>=4.5:1).
           `foreground` = readable text ON the solid `DEFAULT` fill.
           Using the solid colour for `ink` is the bug that made badges
           invisible, because `text-*-ink` and `bg-*` resolved identically. */
        success: {
          DEFAULT: 'rgb(var(--success-rgb) / <alpha-value>)',
          soft: 'rgb(var(--success-soft-rgb) / <alpha-value>)',
          ink: 'rgb(var(--success-ink-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--success-foreground-rgb) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger-rgb) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft-rgb) / <alpha-value>)',
          hover: 'rgb(var(--danger-rgb) / <alpha-value>)',
          ink: 'rgb(var(--danger-ink-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--danger-foreground-rgb) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning-rgb) / <alpha-value>)',
          soft: 'rgb(var(--warning-soft-rgb) / <alpha-value>)',
          ink: 'rgb(var(--warning-ink-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--warning-foreground-rgb) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info-rgb) / <alpha-value>)',
          soft: 'rgb(var(--info-soft-rgb) / <alpha-value>)',
          ink: 'rgb(var(--info-ink-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--info-foreground-rgb) / <alpha-value>)',
        },

        /* Focus ring */
        ring: 'rgb(var(--ring-rgb) / <alpha-value>)',

        /* Neutral ramp — theme-aware, inverts in dark mode. */
        gray: {
          50: 'rgb(var(--n-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--n-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--n-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--n-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--n-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--n-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--n-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--n-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--n-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--n-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--n-950-rgb) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--n-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--n-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--n-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--n-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--n-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--n-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--n-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--n-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--n-800-rgb) / <alpha-value>)',
          850: 'rgb(var(--n-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--n-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--n-950-rgb) / <alpha-value>)',
        },
      },

      /* ---------------- Elevation ----------------
         Monotonic scale: 2xs < xs < sm < md < lg < xl < 2xl.
         `shadow-xs` / `shadow-2xs` were previously undefined and rendered
         nothing, while `shadow-lg` neighbours rendered full default weight. */
      boxShadow: {
        none: 'none',
        '2xs': 'var(--shadow-2xs)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-card)',
        DEFAULT: 'var(--shadow-card)',
        md: 'var(--shadow-raise)',
        lg: 'var(--shadow-popover)',
        xl: 'var(--shadow-popover)',
        '2xl': 'var(--shadow-modal)',
        inner: 'var(--shadow-inset)',
        card: 'var(--shadow-card)',
        raise: 'var(--shadow-raise)',
        popover: 'var(--shadow-popover)',
        modal: 'var(--shadow-modal)',
      },

      /* ---------------- Radius ----------------
         `card` and `xl` deliberately share 12px so the two names people
         reach for interchangeably produce the same surface. */
      /* Restrained radii: controls 6-8px, surfaces 10px, modals 12px.
         The previous 12/14px everywhere read as consumer-app softness. */
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '8px',
        xl: '10px',
        card: '10px',
        modal: '12px',
      },

      ringColor: {
        DEFAULT: 'rgb(var(--ring-rgb) / <alpha-value>)',
      },
      ringOffsetColor: {
        DEFAULT: 'rgb(var(--bg-surface-rgb) / <alpha-value>)',
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
  plugins: [require('@tailwindcss/typography')],
};
