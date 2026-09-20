/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/design-system/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0A0A0B', surface: '#131316', elevated: '#1C1C20' },
        silk: { DEFAULT: '#F9F7F1', muted: 'rgba(249,247,241,0.64)', faint: 'rgba(249,247,241,0.38)' },
        segen: { DEFAULT: '#E50914', hover: '#B20710', glow: '#FF1A25' },
      },
      borderRadius: { sm: '8px', md: '14px', lg: '22px' },
      boxShadow: {
        card: '0 18px 50px rgba(0,0,0,0.55)',
        redglow: '0 8px 32px rgba(229,9,20,0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
