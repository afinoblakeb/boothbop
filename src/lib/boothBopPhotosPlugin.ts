import { registerPlugin } from "@capacitor/core";

// JS bridge to our own native plugin (ios/App/App/AppDelegate.swift →
// BoothBopPhotos). The name MUST match its `jsName`. It's registered
// deterministically in BridgeViewController.capacitorDidLoad(), which avoids the
// Capacitor 8 + SPM auto-registration failure that made @capacitor-community/media
// hang.

export type AccessLevel = "addOnly" | "readWrite";
export type AccessStatus = "granted" | "limited" | "denied" | "notDetermined";

export interface BoothBopPhotosPlugin {
  checkAccess(options: {
    level: AccessLevel;
  }): Promise<{ status: AccessStatus }>;
  requestAccess(options: {
    level: AccessLevel;
  }): Promise<{ status: AccessStatus }>;
  save(options: {
    base64: string;
    type: "image" | "video";
    mime: string;
    /** true → the dedicated BoothBop album (full access); false → camera roll. */
    album: boolean;
  }): Promise<{ assetId: string }>;
}

export const BoothBopPhotos =
  registerPlugin<BoothBopPhotosPlugin>("BoothBopPhotos");
