import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// The site is served from https://<user>.github.io/photoblast/, so assets
// need to resolve under that sub-path. Override with BASE_PATH if you fork
// to a differently-named repo or use a custom domain.
const base = process.env.BASE_PATH ?? "/photoblast/";

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ship a fresh service worker automatically on each deploy.
      registerType: "autoUpdate",
      // Static icons that aren't fingerprinted, so they must be precached too.
      includeAssets: ["apple-touch-icon.png", "favicon-32.png"],
      manifest: {
        name: "PhotoBlast",
        short_name: "PhotoBlast",
        description: "Turn your phone into a selfie photo booth.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0b12",
        theme_color: "#0b0b12",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the whole built app so it runs fully offline after first load.
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
