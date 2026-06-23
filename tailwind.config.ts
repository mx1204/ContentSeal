import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        moss: "#345144",
        mint: "#dbeade",
        paper: "#f7f5ef",
        clay: "#b95f43",
        amber: "#d89a35"
      }
    }
  },
  plugins: []
};

export default config;
