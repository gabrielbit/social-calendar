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
          // Rampa Nocturne (OKLCH) del handoff de diseño.
          100: "#f5f4ff",
          200: "#e7e5fe",
          300: "#d2cefd",
          400: "#b5abfc",
          500: "#968ae0",
          600: "#796cbf",
          700: "#5d5294",
          800: "#423a6a",
          900: "#2b2741",
        },
        neutral: {
          100: "#f3f5fe",
          200: "#e4e7f5",
          300: "#cfd3e5",
          400: "#b2b6ca",
          500: "#9397ab",
          600: "#75798c",
          700: "#595d6c",
          800: "#3f424d",
          900: "#292b31",
        },
        surface: "#16132A",
        border: "rgba(155, 135, 245, 0.16)",
        divider: "rgba(233, 233, 237, 0.16)",
      },
      boxShadow: {
        ds: "0 0 0 1px #3f424d",
        "ds-md": "0 0 0 1px #595d6c, 0 6px 18px rgba(0, 0, 0, 0.55)",
        "ds-lg": "0 0 0 1px #9397ab, 0 16px 40px rgba(0, 0, 0, 0.65)",
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
