import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { rmSync } from "node:fs";
import { join } from "node:path";

/** Drop paths that live under public/ for local/dev but must not ship on Pages. */
function excludeFromPages(relPaths: string[]): Plugin {
  return {
    name: "exclude-from-pages",
    closeBundle() {
      const root = join(process.cwd(), "dist");
      for (const rel of relPaths) {
        rmSync(join(root, rel), { recursive: true, force: true });
      }
    },
  };
}

// Served at the root of ridgecity.icf.games (GitHub Pages custom domain, public/CNAME).
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    // Godot week-1 prototype stays in the repo (godot/WEEK1.md) for local play;
    // it is ~40 MB on the wire and is not part of the React game Pages deploy.
    excludeFromPages(["proto"]),
  ],
});
