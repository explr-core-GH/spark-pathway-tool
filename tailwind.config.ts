import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        charcoal: {
          DEFAULT: "#1A1D1F",
          50: "#F4F5F6",
          100: "#E6E8EA",
          200: "#C8CCD0",
          300: "#A0A6AD",
          400: "#6E767F",
          500: "#3F4549",
          600: "#2A2E31",
          700: "#1A1D1F",
          800: "#101214",
          900: "#08090A",
        },
        explr: {
          DEFAULT: "#2BEDA1",
          50: "#E8FFF6",
          100: "#C6FCE6",
          200: "#8FF7CD",
          300: "#5DF1B7",
          400: "#2BEDA1",
          500: "#15CD86",
          600: "#0FA66C",
          700: "#0B7E52",
          800: "#085739",
          900: "#042E1E",
        },
        // RIASEC palette — Holland hexagon (R-I-A-S-E-C, opposites contrast)
        riasec: {
          r: "#D86B3C", // Realistic — warm terracotta
          i: "#4D5BAE", // Investigative — deep indigo
          a: "#D9417A", // Artistic — vivid pink
          s: "#E5A82F", // Social — golden amber
          e: "#B8364D", // Enterprising — brick red
          c: "#3F7BA8", // Conventional — slate blue
        },
      },
      fontFamily: {
        sans: ["var(--font-lexend)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Slightly larger defaults — accessibility-leaning
        base: ["1.0625rem", { lineHeight: "1.65" }],
        lg: ["1.1875rem", { lineHeight: "1.6" }],
        xl: ["1.375rem", { lineHeight: "1.5" }],
        "2xl": ["1.625rem", { lineHeight: "1.4" }],
        "3xl": ["2rem", { lineHeight: "1.3" }],
        "4xl": ["2.5rem", { lineHeight: "1.2" }],
        "5xl": ["3.25rem", { lineHeight: "1.1" }],
      },
    },
  },
  plugins: [],
};

export default config;
