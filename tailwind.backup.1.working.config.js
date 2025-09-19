/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}', // <- Make sure it scans your app's folders
  ],
  theme: {
    extend: {
      colors: {
        ugaRed: '#BA0C2F',
        ugaBlack: '#000000',
      },
    },
  },
  plugins: [],
};
