/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './staff-ops.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        status: {
          idle: 'hsl(var(--status-idle))',
          prep: 'hsl(var(--status-prep))',
          ready: 'hsl(var(--status-ready))',
          dispatch: 'hsl(var(--status-dispatch))',
          delivering: 'hsl(var(--status-delivering))',
          done: 'hsl(var(--status-done))',
        },
        urgency: {
          normal: 'var(--urgency-normal)',
          warning: 'hsl(var(--urgency-warning))',
          critical: 'hsl(var(--urgency-critical))',
        },
        surface: '#fbfbfc',
        'on-surface': '#18181b',
        'on-surface-variant': '#52525b',
        'surface-container': '#ffffff',
        'surface-container-low': '#f4f4f5',
        'surface-container-lowest': '#ffffff',
        'surface-variant': '#e4e4e7',
        primary: {
          DEFAULT: '#3b82f6',
          container: '#dbeafe',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#16a34a',
          container: '#dcfce7',
          foreground: '#ffffff',
        },
        error: {
          DEFAULT: '#dc2626',
          container: '#fee2e2',
          foreground: '#ffffff',
        },
        outline: {
          DEFAULT: '#a1a1aa',
          variant: '#e4e4e7',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xs: 'calc(var(--radius) - 6px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        glow: '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.15)',
        'glow-red': '0 0 24px rgba(239, 68, 68, 0.2)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        heading: ['Manrope', 'system-ui', 'sans-serif'],
        data: ['Inter', 'ui-monospace', 'system-ui', 'sans-serif'],
        outfit: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
