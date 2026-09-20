import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0C0A16",
        ink: {
          DEFAULT: "#F4F2FF",
          muted: "#9B97B8",
          faint: "#6E6A8A",
        },
        accent: {
          DEFAULT: "#9B87F5",
          hover: "#B5A6FF",
          soft: "rgba(155, 135, 245, 0.14)",
        },
        surface: "#16132A",
        border: "rgba(155, 135, 245, 0.16)",
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
      zIndex: {
        nav: "50",
        overlay: "40",
        raised: "10",
      },
    },
  },
  plugins: [],
};

export default config;
