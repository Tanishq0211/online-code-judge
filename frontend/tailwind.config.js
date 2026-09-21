/** @type {import('tailwindcss').Config} */
/* Stage 8: class-based dark mode — the .dark token block in index.css does
   the theming work; `dark:` variants remain available if ever needed. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        elevated: token('elevated'),
        'border-strong': token('border-strong'),
        fg: {
          DEFAULT: token('fg'),
          secondary: token('fg-secondary'),
          muted: token('fg-muted'),
        },
        accent: {
          DEFAULT: token('accent'),
          hover: token('accent-hover'),
          fg: token('accent-fg'),
          subtle: token('accent-subtle'),
        },
        success: { DEFAULT: token('success'), fg: token('success-fg'), subtle: token('success-subtle') },
        warning: { DEFAULT: token('warning'), fg: token('warning-fg'), subtle: token('warning-subtle') },
        error: { DEFAULT: token('error'), fg: token('error-fg'), subtle: token('error-subtle') },
        info: { DEFAULT: token('info'), fg: token('info-fg'), subtle: token('info-subtle') },
      },
      borderColor: { DEFAULT: token('border') },
      ringColor: { DEFAULT: token('ring') },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
