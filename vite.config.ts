import { defineConfig } from "vite";

/** Base publique pour GitHub Pages (`https://USER.github.io/REPO/`). Définie par CI ou localement. */
const base =
  process.env.BASE_PATH ??
  process.env.VITE_BASE_URL ??
  "/";

/** @see https://developers.arcgis.com/javascript/latest/vite */
export default defineConfig({
  base,
  server: { open: true, port: 5173 },
  preview: { port: 4173 },
  optimizeDeps: { exclude: ["@arcgis/core"] }
});
