/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent-teal)',
        success: 'var(--color-accent-green)',
        info: 'var(--color-accent-teal)',
        purple: 'var(--color-accent-purple)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
        foreground: 'var(--color-foreground)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        destructive: 'var(--color-destructive)',
        'destructive-foreground': 'var(--color-destructive-foreground)'
      },
      boxShadow: {
        card: 'var(--shadow-card)'
      },
      borderRadius: {
        brand: '0.875rem'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

