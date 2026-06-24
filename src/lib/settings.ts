// Auto-save-to-Photos settings (a native iOS capability). Persisted in
// localStorage under the `bb.*` namespace, mirroring the shutter-delay setting.
// All logic here is pure/React-free so it can be unit-tested.

import type { Layout } from "./strip";

export type AutosaveDest = "album" | "cameraRoll";
export type AutosaveFormat = "strip" | "grid" | "gif" | "video";
export type AlbumSaveKind = "image" | "video";

export interface AutosaveSettings {
  /** Where auto-saved media lands: a dedicated album or the camera roll. */
  dest: AutosaveDest;
  strip: boolean;
  grid: boolean;
  gif: boolean;
  video: boolean;
}

const KEYS = {
  dest: "bb.autosave.dest",
  strip: "bb.autosave.strip",
  grid: "bb.autosave.grid",
  gif: "bb.autosave.gif",
  video: "bb.autosave.video",
} as const;

// Opt-in by default: no auto-save (and so no Photos-permission prompt) until the
// user explicitly turns a format on. Album is the default destination.
export const AUTOSAVE_DEFAULTS: AutosaveSettings = {
  dest: "album",
  strip: false,
  grid: false,
  gif: false,
  video: false,
};

export function loadAutosave(): AutosaveSettings {
  return {
    dest:
      localStorage.getItem(KEYS.dest) === "cameraRoll" ? "cameraRoll" : "album",
    strip: localStorage.getItem(KEYS.strip) === "1",
    grid: localStorage.getItem(KEYS.grid) === "1",
    gif: localStorage.getItem(KEYS.gif) === "1",
    video: localStorage.getItem(KEYS.video) === "1",
  };
}

export function saveAutosaveDest(dest: AutosaveDest): void {
  localStorage.setItem(KEYS.dest, dest);
}

export function saveAutosaveFormat(format: AutosaveFormat, on: boolean): void {
  localStorage.setItem(KEYS[format], on ? "1" : "0");
}

export function anyAutosaveOn(s: AutosaveSettings): boolean {
  return s.strip || s.grid || s.gif || s.video;
}

/** One save the orchestrator should perform after a capture. */
export interface AutosaveTask {
  format: AutosaveFormat;
  /** Set for strip/grid (the two `composeStrip` layouts); absent for gif/video. */
  layout?: Layout;
  kind: AlbumSaveKind;
}

/**
 * The save tasks a finished capture should produce, in save order
 * (strip → grid → gif → video). Video is dropped when unsupported.
 */
export function planAutosaveTasks(
  s: AutosaveSettings,
  opts: { videoSupported: boolean },
): AutosaveTask[] {
  const tasks: AutosaveTask[] = [];
  if (s.strip) tasks.push({ format: "strip", layout: "4x1", kind: "image" });
  if (s.grid) tasks.push({ format: "grid", layout: "2x2", kind: "image" });
  if (s.gif) tasks.push({ format: "gif", kind: "image" });
  if (s.video && opts.videoSupported)
    tasks.push({ format: "video", kind: "video" });
  return tasks;
}

// ───────────────────────── Export quality ─────────────────────────
// Each export type (photo strip, GIF, video) has its own Low/Standard/High
// tier. "standard" is a sensible balanced default; "high" trades file size for
// sharpness. Persisted under `bb.quality.*`, mirroring the autosave keys.

export type Quality = "low" | "standard" | "high";
export type QualityMedia = "photo" | "gif" | "video";

export type QualitySettings = Record<QualityMedia, Quality>;

export const QUALITY_DEFAULTS: QualitySettings = {
  photo: "standard",
  gif: "standard",
  video: "standard",
};

const QUALITY_KEYS: Record<QualityMedia, string> = {
  photo: "bb.quality.photo",
  gif: "bb.quality.gif",
  video: "bb.quality.video",
};

function readQuality(key: string): Quality {
  const v = localStorage.getItem(key);
  return v === "low" || v === "high" ? v : "standard";
}

export function loadQuality(): QualitySettings {
  return {
    photo: readQuality(QUALITY_KEYS.photo),
    gif: readQuality(QUALITY_KEYS.gif),
    video: readQuality(QUALITY_KEYS.video),
  };
}

export function saveQuality(media: QualityMedia, q: Quality): void {
  localStorage.setItem(QUALITY_KEYS[media], q);
}

// Pipeline parameters per tier. The photo tier drives the square capture
// resolution (the ceiling everything downstream samples from) and the strip
// cell size; GIF and video carry their own size/bitrate so file size stays
// controllable independently.
export const PHOTO_CAPTURE: Record<Quality, number> = {
  low: 640,
  standard: 900,
  high: 1280,
};

export const GIF_SIZE: Record<Quality, number> = {
  low: 400,
  standard: 540,
  high: 720,
};

export const VIDEO_PROFILE: Record<Quality, { size: number; bitrate: number }> =
  {
    low: { size: 540, bitrate: 3_000_000 },
    standard: { size: 720, bitrate: 6_000_000 },
    high: { size: 1080, bitrate: 10_000_000 },
  };
