/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Set at build time (`VITE_DEMO=1 npm run build`) to enable the screenshot
   * sample loader — staged photos injected as the four captured frames so we can
   * render real strips/GIFs/video for App Store screenshots without a camera.
   * Never set for the submission build.
   */
  readonly VITE_DEMO?: string;
}
