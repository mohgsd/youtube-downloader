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
        primary: '#8B5CF6',      // Purple
        'primary-dark': '#7C3AED', // Darker purple
        secondary: '#6366F1',    // Indigo
        background: '#F9FAFB',   // Light background
        text: '#1F2937',         // Dark text
        accent: '#C4B5FD',       // Light purple accent
      },
      boxShadow: {
        'glow': '0 0 15px 2px rgba(139, 92, 246, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} 