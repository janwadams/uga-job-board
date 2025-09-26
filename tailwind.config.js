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
        // UGA Official Typography - Based on Brand Guidelines
        
        // Primary fonts - Use for prominent elements
        'heading': ['Oswald', 'sans-serif'],        // Headlines, subheads, infographics
        'body': ['Merriweather Sans', 'sans-serif'], // General text and UI elements
        
        // Direct font access for specific use cases
        'oswald': ['Oswald', 'sans-serif'],         // Primary sans-serif
        'merriweather': ['Merriweather', 'serif'],  // Primary serif (sophisticated)
        'merriweather-sans': ['Merriweather Sans', 'sans-serif'], // Secondary sans-serif
        'georgia': ['Georgia', 'serif'],            // Secondary serif (documents)
      },
    },
  },
  plugins: [],
};