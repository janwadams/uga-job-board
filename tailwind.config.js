/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'uga-red': '#BA0C2F',
        'uga-black': '#252525',
        'uga-white': '#FFFFFF',
        'uga-light-gray': '#E5E5E5',
        'uga-medium-gray': '#A3A3A3',
        'uga-dark-gray': '#707070',
      },
      fontFamily: {
        heading: ['Merriweather', 'serif'],
        body: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
