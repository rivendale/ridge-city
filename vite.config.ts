import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served at the root of ridgecity.icf.games (GitHub Pages custom domain, public/CNAME).
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
});
