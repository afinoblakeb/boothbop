import type { Format } from "../types";
import { boomFrameDelay, type BoomSpeed } from "./boom";
import { GIF_DEFAULT_DELAY_MS } from "./gif";
import { frameIndexes } from "./session";

export const SOCIAL_VIDEO_MIME = "video/mp4";
export const SOCIAL_VIDEO_WIDTH = 1080;
export const SOCIAL_VIDEO_HEIGHT = 1920;
export const SOCIAL_FEED_SAFE_HEIGHT = 1350;
export const SOCIAL_VIDEO_BACKGROUND = "#f6e7cf";
export const SOCIAL_VIDEO_TARGET_MS = 5_200;

export type ShareMediaKind = "current" | "download" | "socialVideo";

export interface ShareAction {
  label: string;
  kind: ShareMediaKind;
}

export interface SocialVideoPlan {
  frameIndexes: number[];
  frameMs: number;
  loops: number;
  durationMs: number;
  width: number;
  height: number;
  contentRect: { x: number; y: number; width: number; height: number };
  feedSafeRect: { x: number; y: number; width: number; height: number };
  mimeType: typeof SOCIAL_VIDEO_MIME;
  extension: "mp4";
}

export function shareAction(
  format: Format,
  canShare: boolean,
  socialVideoSupported = true,
): ShareAction {
  if (!canShare) {
    return {
      label:
        format === "video"
          ? "Save Video"
          : format === "gif"
            ? "Save GIF"
            : "Save Photo",
      kind: "download",
    };
  }

  if (format === "gif" && socialVideoSupported) {
    return { label: "Share Animation", kind: "socialVideo" };
  }
  return {
    label:
      format === "video"
        ? "Share Video"
        : format === "gif"
          ? "Share GIF"
          : "Share Photo",
    kind: "current",
  };
}

export function planSocialVideo({
  frameCount,
  boom,
  boomSpeed,
}: {
  frameCount: number;
  boom: boolean;
  boomSpeed: BoomSpeed;
}): SocialVideoPlan {
  if (!Number.isInteger(frameCount) || frameCount < 1) {
    throw new Error("A social video requires at least one frame.");
  }
  const indexes = frameIndexes(frameCount, boom);
  const frameMs = boom ? boomFrameDelay(boomSpeed) : GIF_DEFAULT_DELAY_MS;
  const cycleMs = indexes.length * frameMs;
  const loops = Math.max(1, Math.round(SOCIAL_VIDEO_TARGET_MS / cycleMs));
  const contentY = (SOCIAL_VIDEO_HEIGHT - SOCIAL_VIDEO_WIDTH) / 2;
  const feedSafeY = (SOCIAL_VIDEO_HEIGHT - SOCIAL_FEED_SAFE_HEIGHT) / 2;

  return {
    frameIndexes: indexes,
    frameMs,
    loops,
    durationMs: cycleMs * loops,
    width: SOCIAL_VIDEO_WIDTH,
    height: SOCIAL_VIDEO_HEIGHT,
    contentRect: {
      x: 0,
      y: contentY,
      width: SOCIAL_VIDEO_WIDTH,
      height: SOCIAL_VIDEO_WIDTH,
    },
    feedSafeRect: {
      x: 0,
      y: feedSafeY,
      width: SOCIAL_VIDEO_WIDTH,
      height: SOCIAL_FEED_SAFE_HEIGHT,
    },
    mimeType: SOCIAL_VIDEO_MIME,
    extension: "mp4",
  };
}
