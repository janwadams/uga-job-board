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
        // UGA Official Typography
        
        // Primary fonts - Use these for most prominent elements
        'heading': ['Oswald', 'sans-serif'],        // For headlines, subheads, infographics
        'heading-serif': ['Merriweather', 'serif'], // For sophisticated headlines
        
        // Secondary fonts - Use these for body text and UI
        'body': ['Merriweather Sans', 'sans-serif'], // For general text and UI elements
        'body-serif': ['Georgia', 'serif'],          // For long documents and dense text
        
        // Quick reference aliases (easier to remember)
        'oswald': ['Oswald', 'sans-serif'],
        'merriweather': ['Merriweather', 'serif'],
        'merriweather-sans': ['Merriweather Sans', 'sans-serif'],
        'georgia': ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};