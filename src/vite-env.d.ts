/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Set at build time (`VITE_DEMO=1 npm run build`) to enable screenshot demo
   * shoot buttons. Bundled sample Gallery sets are available in normal builds.
   */
  readonly VITE_DEMO?: string;
}
