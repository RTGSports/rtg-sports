import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f1115",
        surface: "#181b22",
        accent: {
          DEFAULT: "#a855f7",
          50: "#f5ebff",
          100: "#e9d7ff",
          200: "#d4afff",
          300: "#be87ff",
          400: "#a860ff",
          500: "#9228ff",
          600: "#751fd1",
          700: "#5817a3",
          800: "#3a0f75",
          900: "#1d0838"
        },
        muted: "#6b7280"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px -24px rgba(168, 85, 247, 0.45)",
      }
    },
  },
  plugins: [],
};

export default config;
