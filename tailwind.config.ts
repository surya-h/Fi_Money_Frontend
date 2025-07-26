import { type Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#121212",
        card: "#1E1E1E",
        neonGreen: "#00E676",
        purpleGradientStart: "#7E57C2",
        purpleGradientEnd: "#B39DDB",
        primaryText: "rgba(255,255,255,0.95)",
        secondaryText: "#B0BEC5"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      },
    }
  },
  plugins: []
}

export default config;