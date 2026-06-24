/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wc: {
          red: '#DA251D',
          green: '#006847',
          blue: '#003087',
          gold: '#C8A87A',
        },
      },
    },
  },
  plugins: [],
};
