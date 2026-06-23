/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional iCloud link to the "Save to Photoblast Album" Shortcut. */
  readonly VITE_SHORTCUT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
