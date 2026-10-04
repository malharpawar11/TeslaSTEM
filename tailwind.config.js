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
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "python-blue": {
          DEFAULT: "#2563EB",
          50: "#EDF3FA",
          100: "#D3E3F4",
          200: "#A6C6E8",
          300: "#93B8FF",
          400: "#2E79C4",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
          800: "#082D55",
          900: "#06203C",
          // `-dark` reads on light surfaces, `-light` reads on dark surfaces.
          dark: "#1E40AF",
          light: "#93B8FF",
          ink: "#06203C",
        },
        "python-green": {
          DEFAULT: "#07825E",
          50: "#EDF7F2",
          100: "#D3EDE1",
          200: "#A5D9C3",
          300: "#6EE7B7",
          400: "#2E9E76",
          500: "#07825E",
          600: "#066649",
          700: "#06543E",
          800: "#073423",
          900: "#052117",
          dark: "#06543E",
          light: "#6EE7B7",
          ink: "#052117",
        },

        light: {
          bg: "var(--a11y-light-bg, #F3F6FC)",
          surface: "var(--a11y-light-surface, #FFFFFF)",
          card: "var(--a11y-light-surface, #FFFFFF)",
          "surface-2": "var(--a11y-light-surface2, #EAF0FA)",
          "surface-3": "var(--a11y-light-surface3, #E4EAF0)",
          border: "var(--a11y-light-border, #DCE5F1)",
          "border-strong": "var(--a11y-light-borderStrong, #C3CEDA)",
          hairline: "var(--a11y-light-hairline, #E8EDF2)",
          text: "var(--a11y-light-text, #13213D)",
          secondary: "var(--a11y-light-secondary, #33465A)",
          muted: "var(--a11y-light-muted, #63758A)",
          subtle: "var(--a11y-light-subtle, #91A0B0)",
        },
        dark: {
          bg: "var(--a11y-dark-bg, #091224)",
          surface: "var(--a11y-dark-surface, #101D33)",
          card: "var(--a11y-dark-surface, #101D33)",
          "surface-2": "var(--a11y-dark-surface2, #172940)",
          "surface-3": "var(--a11y-dark-surface3, #0E141D)",
          border: "var(--a11y-dark-border, #263B56)",
          "border-strong": "var(--a11y-dark-borderStrong, #324357)",
          hairline: "var(--a11y-dark-hairline, #1A2531)",
          text: "var(--a11y-dark-text, #E9EFF5)",
          secondary: "var(--a11y-dark-secondary, #B6C4D2)",
          muted: "var(--a11y-dark-muted, #8397A9)",
          subtle: "var(--a11y-dark-subtle, #5E7183)",
        },

        success: {
          DEFAULT: "#07825E",
          soft: "rgba(18,128,90,0.12)",
        },
        info: {
          DEFAULT: "#2563EB",
          soft: "rgba(14,90,168,0.12)",
        },
        warn: {
          DEFAULT: "#B45309",
          soft: "rgba(180,83,9,0.12)",
        },
        danger: {
          DEFAULT: "#B42318",
          soft: "rgba(180,35,24,0.12)",
        },
      },

      fontFamily: {
        sans: ["System"],
      },

      // Restrained scale: body text sits at 15px, headings top out at 30px.
      // Nothing here is display type; this is an information app, not a
      // marketing page.
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

      // Calmer geometry. Cards land at 12–16px instead of 28–32px pills, which
      // is what separates "software" from "sticker sheet".
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "18px",
        "2xl": "24px",
        "3xl": "30px",
        "4xl": "24px",
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

      // Depth comes from borders first, shadow second. These are deliberately
      // faint so cards read as surfaces, not floating chips.
      boxShadow: {
        ambient: "0 1px 2px rgba(14, 26, 38, 0.05)",
        elevated:
          "0 2px 8px rgba(14, 26, 38, 0.07), 0 1px 2px rgba(14, 26, 38, 0.04)",
        floating:
          "0 12px 32px rgba(14, 26, 38, 0.12), 0 2px 6px rgba(14, 26, 38, 0.06)",
      },
    },
  },
  plugins: [],
};
