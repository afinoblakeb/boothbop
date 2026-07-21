import type { Format } from "../types";
import { boomFrameDelay, type BoomSpeed } from "./boom";
import { GIF_DEFAULT_DELAY_MS } from "./gif";
import { frameIndexes } from "./session";

export const SOCIAL_VIDEO_MIME = "video/mp4";
export const SOCIAL_VIDEO_MIN_SIZE = 720;
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
  size: number;
  mimeType: typeof SOCIAL_VIDEO_MIME;
  extension: "mp4";
}

export function shareAction(format: Format, canShare: boolean): ShareAction {
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

  if (format === "gif") {
    return { label: "Share Animation", kind: "socialVideo" };
  }
  return {
    label: format === "video" ? "Share Video" : "Share Photo",
    kind: "current",
  };
}

export function planSocialVideo({
  frameCount,
  boom,
  boomSpeed,
  requestedSize,
}: {
  frameCount: number;
  boom: boolean;
  boomSpeed: BoomSpeed;
  requestedSize: number;
}): SocialVideoPlan {
  if (!Number.isInteger(frameCount) || frameCount < 1) {
    throw new Error("A social video requires at least one frame.");
  }
  if (!Number.isFinite(requestedSize) || requestedSize < 1) {
    throw new Error("A social video requires a positive output size.");
  }

  const indexes = frameIndexes(frameCount, boom);
  const frameMs = boom ? boomFrameDelay(boomSpeed) : GIF_DEFAULT_DELAY_MS;
  const cycleMs = indexes.length * frameMs;
  const loops = Math.max(1, Math.round(SOCIAL_VIDEO_TARGET_MS / cycleMs));

  return {
    frameIndexes: indexes,
    frameMs,
    loops,
    durationMs: cycleMs * loops,
    size: Math.max(SOCIAL_VIDEO_MIN_SIZE, Math.round(requestedSize)),
    mimeType: SOCIAL_VIDEO_MIME,
    extension: "mp4",
  };
}
