/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          400: '#5b8def',
          500: '#3466f6',
          600: '#254edb',
          700: '#1e3fb0',
        },
      },
    },
  },
  plugins: [],
};
