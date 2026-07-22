import { describe, expect, it } from "vitest";
import { mediaRenderKey } from "./renderKey";

describe("mediaRenderKey", () => {
  it("never deduplicates identical options across photo sessions", () => {
    const choices = { filter: "warm", branding: true };
    expect(mediaRenderKey(10, "gif", choices)).not.toBe(
      mediaRenderKey(11, "gif", choices),
    );
  });

  it("separates layouts and output kinds within one session", () => {
    expect(mediaRenderKey(10, "strip", {}, "4x1")).not.toBe(
      mediaRenderKey(10, "strip", {}, "2x2"),
    );
    expect(mediaRenderKey(10, "gif", {})).not.toBe(
      mediaRenderKey(10, "video", {}),
    );
  });
});
