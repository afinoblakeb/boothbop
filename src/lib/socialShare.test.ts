import { describe, expect, it } from "vitest";
import {
  SOCIAL_VIDEO_MIN_SIZE,
  SOCIAL_VIDEO_MIME,
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
      requestedSize: 1080,
    });

    expect(plan.frameIndexes).toEqual([0, 1, 2, 3]);
    expect(plan.frameMs).toBe(450);
    expect(plan.loops).toBe(3);
    expect(plan.durationMs).toBe(5400);
    expect(plan.size).toBe(1080);
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
        requestedSize: 720,
      });

      expect(plan.frameIndexes).toEqual([0, 1, 2, 3, 2, 1]);
      expect(plan.frameMs).toBe(frameMs);
      expect(plan.loops).toBe(loops);
      expect(plan.durationMs).toBe(durationMs);
    },
  );

  it("enforces the social-video resolution floor", () => {
    expect(
      planSocialVideo({
        frameCount: 4,
        boom: false,
        boomSpeed: 3,
        requestedSize: 540,
      }).size,
    ).toBe(SOCIAL_VIDEO_MIN_SIZE);
  });

  it("rejects an empty animation", () => {
    expect(() =>
      planSocialVideo({
        frameCount: 0,
        boom: false,
        boomSpeed: 3,
        requestedSize: 1080,
      }),
    ).toThrow("at least one frame");
  });
});
