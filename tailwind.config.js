/** @type {import('tailwindcss').Config} */

/**
 * Design tokens for the Tesla STEM club platform.
 *
 * Brand: blue is primary (chrome, primary actions, links, focus, selection),
 * green is the accent reserved for confirmation and membership. The class
 * names `python-blue` / `python-green` are kept so markup reads the same, but
 * the ramps below are the deeper, lower-chroma pair the app actually uses.
 *
 * Keep this file in sync with src/theme/tokens.ts, which serves the same
 * colors to the places Tailwind can't reach (icon props, gradient stops).
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'python-blue': {
          DEFAULT: '#0E5AA8',
          50: '#EDF3FA',
          100: '#D3E3F4',
          200: '#A6C6E8',
          300: '#6BA1D8',
          400: '#2E79C4',
          500: '#0E5AA8',
          600: '#0C4A8B',
          700: '#0A3B6F',
          800: '#082D55',
          900: '#06203C',
          // `-dark` reads on light surfaces, `-light` reads on dark surfaces.
          dark: '#0A3B6F',
          light: '#6BA1D8',
          ink: '#06203C',
        },
        'python-green': {
          DEFAULT: '#12805A',
          50: '#EDF7F2',
          100: '#D3EDE1',
          200: '#A5D9C3',
          300: '#6BBF9D',
          400: '#2E9E76',
          500: '#12805A',
          600: '#0D6141',
          700: '#0A4A32',
          800: '#073423',
          900: '#052117',
          dark: '#0A4A32',
          light: '#6BBF9D',
          ink: '#052117',
        },

        light: {
          bg: '#F6F8FA',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          'surface-2': '#EEF2F6',
          'surface-3': '#E4EAF0',
          border: '#DDE3EA',
          'border-strong': '#C3CEDA',
          hairline: '#E8EDF2',
          text: '#0E1A26',
          secondary: '#33465A',
          muted: '#63758A',
          subtle: '#91A0B0',
        },
        dark: {
          bg: '#0B1017',
          surface: '#111823',
          card: '#111823',
          'surface-2': '#172230',
          'surface-3': '#0E141D',
          border: '#22303F',
          'border-strong': '#324357',
          hairline: '#1A2531',
          text: '#E9EFF5',
          secondary: '#B6C4D2',
          muted: '#8397A9',
          subtle: '#5E7183',
        },

        success: {
          DEFAULT: '#12805A',
          soft: 'rgba(18,128,90,0.12)',
        },
        info: {
          DEFAULT: '#0E5AA8',
          soft: 'rgba(14,90,168,0.12)',
        },
        warn: {
          DEFAULT: '#B45309',
          soft: 'rgba(180,83,9,0.12)',
        },
        danger: {
          DEFAULT: '#B42318',
          soft: 'rgba(180,35,24,0.12)',
        },
      },

      fontFamily: {
        sans: ['System'],
      },

      // Restrained scale: body text sits at 15px, headings top out at 30px.
      // Nothing here is display type; this is an information app, not a
      // marketing page.
      fontSize: {
        '2xs': ['11px', { lineHeight: '15px', letterSpacing: '0.2px' }],
        xs: ['12px', { lineHeight: '17px' }],
        sm: ['13px', { lineHeight: '19px' }],
        base: ['15px', { lineHeight: '22px' }],
        lg: ['17px', { lineHeight: '24px' }],
        xl: ['19px', { lineHeight: '26px', letterSpacing: '-0.1px' }],
        '2xl': ['22px', { lineHeight: '29px', letterSpacing: '-0.2px' }],
        '3xl': ['26px', { lineHeight: '33px', letterSpacing: '-0.3px' }],
        '4xl': ['30px', { lineHeight: '37px', letterSpacing: '-0.4px' }],
        '5xl': ['36px', { lineHeight: '43px', letterSpacing: '-0.6px' }],
        '6xl': ['42px', { lineHeight: '49px', letterSpacing: '-0.8px' }],
      },

      letterSpacing: {
        tightest: '-0.6px',
        tighter: '-0.4px',
        tight: '-0.2px',
        normal: '0',
        wide: '0.2px',
        wider: '0.4px',
        widest: '0.8px',
      },

      // Calmer geometry. Cards land at 12–16px instead of 28–32px pills, which
      // is what separates "software" from "sticker sheet".
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },

      spacing: {
        0.5: '2px',
        1.5: '6px',
        2.5: '10px',
        3.5: '14px',
        4.5: '18px',
        18: '72px',
        22: '88px',
        26: '104px',
      },

      // Depth comes from borders first, shadow second. These are deliberately
      // faint so cards read as surfaces, not floating chips.
      boxShadow: {
        ambient: '0 1px 2px rgba(14, 26, 38, 0.05)',
        elevated: '0 2px 8px rgba(14, 26, 38, 0.07), 0 1px 2px rgba(14, 26, 38, 0.04)',
        floating: '0 12px 32px rgba(14, 26, 38, 0.12), 0 2px 6px rgba(14, 26, 38, 0.06)',
      },
    },
  },
  plugins: [],
};
