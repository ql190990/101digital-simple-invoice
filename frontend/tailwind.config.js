/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          500: '#3b6cff',
          600: '#2f57e6',
          700: '#243fb3',
        },
      },
    },
  },
  plugins: [],
};
