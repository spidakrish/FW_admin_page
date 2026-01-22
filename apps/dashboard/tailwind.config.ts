import type { Config } from "tailwindcss";
import sharedPreset from "../../packages/shared-ui/tailwind-preset";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/shared-ui/src/**/*.{ts,tsx}"
  ],
  presets: [sharedPreset]
};

export default config;
