/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { gold: '#F5C518', orange: '#FF6B35' },
      fontFamily: {
        display: ['Unbounded', 'sans-serif'],
        body:    ['DM Sans',    'sans-serif'],
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop:    { from: { opacity: '0', transform: 'scale(0.75)' },       to: { opacity: '1', transform: 'scale(1)' } },
        bob:    { '0%,100%': { transform: 'translateY(0)' },               '50%': { transform: 'translateY(-8px)' } },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease both',
        pop:    'pop .45s cubic-bezier(.34,1.56,.64,1) both',
        bob:    'bob 1.2s ease infinite',
      },
    },
  },
  plugins: [],
}
