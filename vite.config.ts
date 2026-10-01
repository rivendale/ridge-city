import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves this repo at /ridge-city/.
export default defineConfig({
  base: "/ridge-city/",
  plugins: [react(), tailwindcss()],
});
