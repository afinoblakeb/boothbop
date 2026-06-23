import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The site is served from https://<user>.github.io/photoblast/, so assets
// need to resolve under that sub-path. Override with BASE_PATH if you fork
// to a differently-named repo or use a custom domain.
const base = process.env.BASE_PATH ?? "/photoblast/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
});
