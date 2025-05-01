/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF0000',      // YouTube red
        secondary: '#282828',    // Dark gray for UI elements
        background: '#0F0F0F',   // Dark background
        text: '#FFFFFF',         // White text
        accent: '#3EA6FF',       // Blue accent
      },
    },
  },
  plugins: [],
} 