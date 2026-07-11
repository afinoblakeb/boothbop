import { defineConfig } from "vitest/config";

// Unit tests run in jsdom. The app is browser-heavy (canvas, getUserMedia,
// MediaRecorder, IndexedDB) — these tests cover the pure logic and the bits
// that can be faked in jsdom (IndexedDB via fake-indexeddb, navigator probes).
// Canvas-pixel and live-camera behaviour are not covered here; verify those in
// a real browser (see CLAUDE.md → "What unit tests can and can't cover").
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
    },
  },
});
