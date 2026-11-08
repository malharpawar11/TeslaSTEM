/** @type {import('tailwindcss').Config} */

/**
 * Design tokens for Tesla STEM Clubs: black and white sheets with royal blue
 * and laurel green accents from the Pythons crest, Big Shoulders Display for
 * type that carries a page and Atkinson Hyperlegible for reading.
 *
 * Keep this file in sync with src/theme/tokens.ts.
 */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "python-blue": {
          DEFAULT: "#3068F0",
          50: "#EDF2FE",
          100: "#DAE5FD",
          200: "#B6CBFB",
          300: "#8AAEFF",
          400: "#5C8AF6",
          500: "#3068F0",
          600: "#2556CC",
          700: "#1C44A6",
          800: "#14307A",
          900: "#0D2052",
          dark: "#1C44A6",
          light: "#8AAEFF",
          ink: "#0D2052",
        },
        "python-green": {
          DEFAULT: "#3A8F1E",
          50: "#EFF9EA",
          100: "#DBF1CF",
          200: "#B8E3A0",
          300: "#7FD955",
          400: "#5CB82E",
          500: "#3A8F1E",
          600: "#2F7518",
          700: "#255C13",
          800: "#1A420D",
          900: "#102A08",
          dark: "#255C13",
          light: "#7FD955",
          ink: "#102A08",
        },
        ink: { DEFAULT: "#000000", night: "#000000" },
        laurel: { DEFAULT: "#5CB82E", soft: "#B8E3A0" },

        light: {
          bg: "var(--a11y-light-bg, #FFFFFF)",
          surface: "var(--a11y-light-surface, #FFFFFF)",
          card: "var(--a11y-light-surface, #FFFFFF)",
          "surface-2": "var(--a11y-light-surface2, #F2F2F2)",
          "surface-3": "var(--a11y-light-surface3, #E8E8E8)",
          border: "var(--a11y-light-border, #E0E0E0)",
          "border-strong": "var(--a11y-light-borderStrong, #BDBDBD)",
          hairline: "var(--a11y-light-hairline, #EEEEEE)",
          text: "var(--a11y-light-text, #000000)",
          secondary: "var(--a11y-light-secondary, #333333)",
          muted: "var(--a11y-light-muted, #666666)",
          subtle: "var(--a11y-light-subtle, #767676)",
        },
        dark: {
          bg: "var(--a11y-dark-bg, #000000)",
          surface: "var(--a11y-dark-surface, #111111)",
          card: "var(--a11y-dark-surface, #111111)",
          "surface-2": "var(--a11y-dark-surface2, #1C1C1C)",
          "surface-3": "var(--a11y-dark-surface3, #0A0A0A)",
          border: "var(--a11y-dark-border, #2A2A2A)",
          "border-strong": "var(--a11y-dark-borderStrong, #4A4A4A)",
          hairline: "var(--a11y-dark-hairline, #1E1E1E)",
          text: "var(--a11y-dark-text, #FFFFFF)",
          secondary: "var(--a11y-dark-secondary, #D4D4D4)",
          muted: "var(--a11y-dark-muted, #A3A3A3)",
          subtle: "var(--a11y-dark-subtle, #8A8A8A)",
        },

        success: {
          DEFAULT: "#3A8F1E",
          soft: "rgba(18,128,90,0.12)",
        },
        info: {
          DEFAULT: "#3068F0",
          soft: "rgba(14,90,168,0.12)",
        },
        warn: {
          DEFAULT: "#A86A00",
          soft: "rgba(180,83,9,0.12)",
        },
        danger: {
          DEFAULT: "#D6402F",
          soft: "rgba(180,35,24,0.12)",
        },
      },

      fontFamily: {
        sans: ["System"],
        display: ["BigShoulders"],
      },

      // Reading scale. Display sizes are set on <Display>, not here.
      fontSize: {
        "2xs": ["11px", { lineHeight: "15px", letterSpacing: "0.2px" }],
        xs: ["12px", { lineHeight: "17px" }],
        sm: ["13px", { lineHeight: "19px" }],
        base: ["15px", { lineHeight: "22px" }],
        lg: ["17px", { lineHeight: "24px" }],
        xl: ["19px", { lineHeight: "26px", letterSpacing: "-0.1px" }],
        "2xl": ["22px", { lineHeight: "29px", letterSpacing: "-0.2px" }],
        "3xl": ["26px", { lineHeight: "33px", letterSpacing: "-0.3px" }],
        "4xl": ["30px", { lineHeight: "37px", letterSpacing: "-0.4px" }],
        "5xl": ["36px", { lineHeight: "43px", letterSpacing: "-0.6px" }],
        "6xl": ["42px", { lineHeight: "49px", letterSpacing: "-0.8px" }],
      },

      letterSpacing: {
        tightest: "-0.6px",
        tighter: "-0.4px",
        tight: "-0.2px",
        normal: "0",
        wide: "0.2px",
        wider: "0.4px",
        widest: "0.8px",
      },

            // Print-shop corners: small and nearly uniform. Roundness is reserved for
      // things that are literally circles (avatars, switches, dots).
      borderRadius: {
        xs: "2px",
        sm: "3px",
        md: "4px",
        lg: "4px",
        xl: "5px",
        "2xl": "6px",
        "3xl": "8px",
        "4xl": "8px",
      },

      spacing: {
        0.5: "2px",
        1.5: "6px",
        2.5: "10px",
        3.5: "14px",
        4.5: "18px",
        18: "72px",
        22: "88px",
        26: "104px",
      },

      // Depth comes from ink and rules, not shadow.
      boxShadow: {
        ambient: "0 0 0 rgba(0,0,0,0)",
        elevated: "0 0 0 rgba(0,0,0,0)",
        floating: "0 10px 30px rgba(11, 22, 80, 0.28)",
      },
    },
  },
  plugins: [],
};
