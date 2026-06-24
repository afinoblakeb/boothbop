import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.boothbop.app",
  appName: "BoothBop",
  // Keep the console clean — no Capacitor bridge call logging.
  loggingBehavior: "none",
  // The built web app. There is deliberately NO `server.url` here: the native
  // app loads only these bundled assets (capacitor://localhost) and never points
  // the web view at a remote website. This is core to passing App Store
  // Guideline 4.2 (it is a real app, not a wrapped website).
  webDir: "dist",
  backgroundColor: "#f6e7cf",
  ios: {
    backgroundColor: "#f6e7cf",
    // The web app already handles safe areas via env(safe-area-inset-*), so let
    // it go edge-to-edge rather than double-insetting.
    contentInset: "never",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: "#f6e7cf",
      showSpinner: false,
    },
  },
};

export default config;
