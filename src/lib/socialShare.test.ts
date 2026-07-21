import { describe, expect, it } from "vitest";
import {
  SOCIAL_FEED_SAFE_HEIGHT,
  SOCIAL_VIDEO_BACKGROUND,
  SOCIAL_VIDEO_HEIGHT,
  SOCIAL_VIDEO_MIME,
  SOCIAL_VIDEO_WIDTH,
  planSocialVideo,
  shareAction,
} from "./socialShare";

describe("social-ready sharing", () => {
  it("shares GIF animations as social-compatible MP4 by default", () => {
    expect(shareAction("gif", true, true)).toEqual({
      label: "Share Animation",
      kind: "socialVideo",
    });
    expect(shareAction("strip", true)).toEqual({
      label: "Share Photo",
      kind: "current",
    });
    expect(shareAction("video", true)).toEqual({
      label: "Share Video",
      kind: "current",
    });
  });

  it("keeps the GIF payload when this browser cannot make MP4", () => {
    expect(shareAction("gif", true, false)).toEqual({
      label: "Share GIF",
      kind: "current",
    });
  });

  it("retains specific save labels when file sharing is unavailable", () => {
    expect(shareAction("strip", false).label).toBe("Save Photo");
    expect(shareAction("gif", false).label).toBe("Save GIF");
    expect(shareAction("video", false).label).toBe("Save Video");
  });

  it("matches the normal GIF timing and creates a useful social duration", () => {
    const plan = planSocialVideo({
      frameCount: 4,
      boom: false,
      boomSpeed: 3,
    });

    expect(plan.frameIndexes).toEqual([0, 1, 2, 3]);
    expect(plan.frameMs).toBe(450);
    expect(plan.loops).toBe(3);
    expect(plan.durationMs).toBe(5400);
    expect(plan.width).toBe(SOCIAL_VIDEO_WIDTH);
    expect(plan.height).toBe(SOCIAL_VIDEO_HEIGHT);
    expect(plan.contentRect).toEqual({
      x: 0,
      y: 420,
      width: 1080,
      height: 1080,
    });
    expect(plan.feedSafeRect).toEqual({
      x: 0,
      y: 285,
      width: 1080,
      height: SOCIAL_FEED_SAFE_HEIGHT,
    });
    expect(plan.contentRect.y).toBeGreaterThan(plan.feedSafeRect.y);
    expect(plan.contentRect.y + plan.contentRect.height).toBeLessThan(
      plan.feedSafeRect.y + plan.feedSafeRect.height,
    );
    expect(plan.mimeType).toBe(SOCIAL_VIDEO_MIME);
    expect(plan.extension).toBe("mp4");
  });

  it.each([
    [1, 420, 2, 5040],
    [2, 260, 3, 4680],
    [3, 160, 5, 4800],
  ] as const)(
    "preserves Boom speed %s while keeping the clip shareable",
    (boomSpeed, frameMs, loops, durationMs) => {
      const plan = planSocialVideo({
        frameCount: 4,
        boom: true,
        boomSpeed,
      });

      expect(plan.frameIndexes).toEqual([0, 1, 2, 3, 2, 1]);
      expect(plan.frameMs).toBe(frameMs);
      expect(plan.loops).toBe(loops);
      expect(plan.durationMs).toBe(durationMs);
    },
  );

  it("uses a stable Instagram-safe canvas and BoothBop background", () => {
    const plan = planSocialVideo({
      frameCount: 4,
      boom: false,
      boomSpeed: 3,
    });
    expect([plan.width, plan.height]).toEqual([1080, 1920]);
    expect(SOCIAL_VIDEO_BACKGROUND).toBe("#f6e7cf");
  });

  it("rejects an empty animation", () => {
    expect(() =>
      planSocialVideo({
        frameCount: 0,
        boom: false,
        boomSpeed: 3,
      }),
    ).toThrow("at least one frame");
  });
});
