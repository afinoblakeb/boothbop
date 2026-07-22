import { registerPlugin } from "@capacitor/core";

// JS bridge to our own native plugin (ios/App/App/AppDelegate.swift →
// BoothBopVideo). The name MUST match its `jsName`. Registered deterministically
// in BridgeViewController.capacitorDidLoad() — same pattern as BoothBopPhotos —
// so it can't fall foul of the Capacitor 8 + SPM auto-registration failure.
//
// `make` takes the already-scaled, already-watermarked frames as base64 PNGs
// and returns a finished MP4 as base64. The native side just muxes them with
// AVAssetWriter, so it's a real (sub-second) encode, not a real-time recording.

export interface BoothBopVideoPlugin {
  make(options: {
    jobId: string;
    images: string[]; // base64 PNG frames, in play order (no data: prefix needed)
    size: number; // legacy square fallback
    width: number;
    height: number;
    bitrate: number; // target average bitrate (bits/sec)
    frameMs: number; // how long each photo is held
    loops: number; // how many times to cycle the 4 photos
    fps: number; // output frame rate
  }): Promise<{ base64: string }>;
  cancel(options: { jobId: string }): Promise<{ cancelled: boolean }>;
}

export const BoothBopVideo =
  registerPlugin<BoothBopVideoPlugin>("BoothBopVideo");
