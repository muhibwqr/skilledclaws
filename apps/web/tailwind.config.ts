import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#1a1a1a",
        border: "#333333",
        text: "#e0e0e0",
        muted: "#888888",
        accent: "#ffffff",
      },
    },
  },
  plugins: [],
};

export default config;
