
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'uga-red': '#BA0C2F',
        'uga-black': '#252525',
        'uga-white': '#FFFFFF',
        'uga-light-gray': '#F5F5F5',
        'uga-medium-gray': '#A3A3A3',
      },
      fontFamily: {
        heading: ['Merriweather', 'serif'],
        body: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

