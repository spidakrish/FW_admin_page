import type { Config } from "tailwindcss";

const sharedPreset: Partial<Config> = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          teal: {
            DEFAULT: "#00a19b",
            deep: "#006d68",
            soft: "#7fded7"
          },
          pewter: "#888b8d",
          charcoal: "#1f2625",
          parchment: "#f5efe3",
          mist: "#ecf2f1"
        }
      },
      boxShadow: {
        card: "0 30px 60px -35px rgba(10, 31, 29, 0.35)",
        glow: "0 0 40px rgba(0, 161, 155, 0.35)"
      }
    }
  }
};

export default sharedPreset;
