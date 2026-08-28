/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        muted: 'hsl(var(--muted))',
        accent: 'hsl(var(--accent))',
        destructive: 'hsl(var(--destructive))',
        border: 'hsl(var(--border))',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(0 0% 100% / .4), hsl(0 0% 100% / .4))',
        'gradient-card': 'linear-gradient(135deg, hsl(0 0% 100% / .4), hsl(0 0% 100% / .4))',
      },
      boxShadow: {
        elegant: '0 .83333rem 2.5rem -.83333rem hsl(0 0% 0% / .3)',
        glow: '0 0 1.66667rem hsl(0 0% 100% / .3)',
      },
      borderRadius: { 'xl': '.75rem' },
    }
  },
  plugins: []
};
