import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("ios/App/App/AppDelegate.swift", "utf8");

describe("native camera source contract", () => {
  it("prepares full-quality photo resources before reporting the camera ready", () => {
    expect(source).toContain("setPreparedPhotoSettingsArray");
    expect(source).toContain("photoPreparationComplete");
    expect(source).toContain("finishStartIfReady");
    expect(source).toContain("isResponsiveCaptureEnabled = true");
    expect(source).not.toContain("isFastCapturePrioritizationEnabled = true");
  });

  it("renders face tracking as a temporary, re-armable confidence cue", () => {
    expect(source).toContain("let cueDuration: CFTimeInterval = 1.2");
    expect(source).toContain("let redetectionDelay: CFTimeInterval = 0.45");
    expect(source).toContain(".insetBy(dx: 8, dy: 8)");
    expect(source).toContain(".withAlphaComponent(0.5).cgColor");
  });
});
