import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        slateblue: "#334155",
        mist: "#FAFAF7",
        teal: "#EA6A0A",
        atlas: "#EA6A0A",
        "atlas-soft": "#FFF3EA",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.045)",
      },
    },
  },
  plugins: [],
};

export default config;
