// App-level configuration. These are safe to expose publicly — no secrets.

/** Name of the iOS Photos album the Save shortcut targets. */
export const ALBUM_NAME = "Photoblast";

/**
 * Shared iCloud link to the "Save to Photoblast Album" Shortcut.
 *
 * Leave blank to ship without it — the in-app help will then explain how to
 * build the Shortcut by hand. Once you've created and shared the Shortcut from
 * the iOS Shortcuts app, set it here (or pass VITE_SHORTCUT_URL at build time):
 *
 *   VITE_SHORTCUT_URL=https://www.icloud.com/shortcuts/xxxxxxxx npm run build
 */
export const SHORTCUT_URL = import.meta.env.VITE_SHORTCUT_URL ?? "";
