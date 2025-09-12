/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // START: Lulu's Custom Animations
      keyframes: {
        breathing: {
          '0%, 100%': { borderColor: 'rgba(168, 85, 247, 0.2)' },
          '50%': { borderColor: 'rgba(168, 85, 247, 0.6)' },
        },
      },
      animation: {
        breathing: 'breathing 4s ease-in-out infinite',
      },
      // END: Lulu's Custom Animations
    },
  },
  plugins: [],
}