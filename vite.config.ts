import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { removeDemoAssetsFromProduction } from "./scripts/lib/demo-asset-exclusion";

// Served from the custom-domain root (boothbop.com). Override with BASE_PATH
// for a project-page build served from a sub-path.
const base = process.env.BASE_PATH ?? "/";
const isDemoBuild = process.env.VITE_DEMO === "1";

export default defineConfig({
  base,
  plugins: [
    {
      name: "exclude-demo-assets-from-production",
      apply: "build",
      async closeBundle() {
        await removeDemoAssetsFromProduction(
          new URL("dist", import.meta.url).pathname,
          isDemoBuild,
        );
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      // Ship a fresh service worker automatically on each deploy (applies on
      // next close/reopen of the installed app).
      registerType: "autoUpdate",
      // Registration is done manually in src/main.tsx so it can be skipped in
      // the native (Capacitor) WKWebView shell, where a service worker is moot
      // and only causes stale-asset/console noise. (null = no auto-injected
      // registerSW script.)
      injectRegister: null,
      // Static icons that aren't fingerprinted, so they must be precached too.
      includeAssets: ["apple-touch-icon.png", "favicon-32.png"],
      manifest: {
        name: "BoothBop",
        short_name: "BoothBop",
        description: "Turn your phone into a selfie photo booth.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f4f5f5",
        theme_color: "#f4f5f5",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the whole built app so it runs fully offline after first load.
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest,woff2}"],
        globIgnores: ["**/og-image.png"], // social preview only; not needed offline
        navigateFallback: "index.html",
        // Legal/support pages are real static HTML — never replace them with the
        // SPA shell on navigation.
        navigateFallbackDenylist: [/^\/(privacy|terms|support)/],
      },
    }),
  ],
});
