/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#F1F5F9',
        primary: { DEFAULT: '#F97316', light: '#FB923C', dark: '#EA580C' },
        accent: '#FFAB00',
        bg: { DEFAULT: '#08090A', alt: '#111214' },
        surface: { DEFAULT: '#111214', raised: '#1A1C20' },
        'text-secondary': '#94A3B8',
        border: '#2A2D33',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin 20s linear infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'orbit': 'orbit 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(80px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(80px) rotate(-360deg)' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(249,115,22,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.06) 1px, transparent 1px)",
        'radial-ember': 'radial-gradient(circle at 50% 50%, rgba(249,115,22,0.18), transparent 70%)',
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(249,115,22,0.25), transparent)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'ember': '0 0 40px rgba(249,115,22,0.3), 0 0 80px rgba(249,115,22,0.1)',
        'ember-sm': '0 0 20px rgba(249,115,22,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 48px rgba(249,115,22,0.15), 0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
