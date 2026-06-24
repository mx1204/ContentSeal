import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07100d",
        moss: "#16c8a0",
        mint: "#dffdf3",
        paper: "#f3f8f5",
        clay: "#ff6b5c",
        amber: "#ffb454",
        void: "#050807",
        graphite: "#0d1512",
        panel: "#101c17",
        frost: "#eef8f2",
        wire: "#6ee7d8",
        pulse: "#a3ff7a",
        cobalt: "#5b8cff"
      }
    }
  },
  plugins: []
};

export default config;
