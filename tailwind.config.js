/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './apps/frontend/index.html',
    './apps/frontend/src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
