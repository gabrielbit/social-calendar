import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF8F5",
        ink: {
          DEFAULT: "#1C1917",
          muted: "#57534E",
          faint: "#78716C",
        },
        accent: {
          DEFAULT: "#C4704B",
          hover: "#A85A3A",
          soft: "#F5E6DE",
        },
        surface: "#FFFFFF",
        border: "#E7E5E4",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
