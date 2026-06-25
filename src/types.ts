// Shared UI types used across App and its screens.

/** The app's top-level flow. */
export type Phase = "idle" | "preview" | "capturing" | "review";

/** The export formats shown on the review screen. */
export type Format = "strip" | "gif" | "boomerang" | "video";

// The Chromium "install app" event (Android / desktop). Not in lib.dom.
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
