/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'python-green': {
          DEFAULT: '#4CAF50',
          dark: '#3D9140',
          light: '#6FBF73',
        },
        'python-blue': {
          DEFAULT: '#1565C0',
          dark: '#0F4C92',
          light: '#4285D0',
        },
        offwhite: '#F5F5F5',
        light: {
          bg: '#F8F9FA',
          card: '#FFFFFF',
          border: '#E0E0E0',
          text: '#0A0A0A',
          muted: '#5A6470',
        },
        dark: {
          bg: '#0A0A0A',
          card: '#1A1A1A',
          border: '#2A2A2A',
          text: '#FFFFFF',
          muted: '#9AA3AD',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
