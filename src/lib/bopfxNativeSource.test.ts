import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("ios/App/App/BopFXRenderer.swift", "utf8");
const cameraSource = readFileSync("ios/App/App/AppDelegate.swift", "utf8");

describe("native BopFX renderer source contract", () => {
  it("keeps native and TypeScript effect identifiers aligned", () => {
    for (const id of [
      "original",
      "spectralEcho",
      "funhouse",
      "cutoutChorus",
      "mirrorBloom",
    ]) {
      expect(source).toContain(`case ${id}`);
    }
  });

  it("uses Vision for geometry and segmentation without identity analysis", () => {
    expect(source).toContain("VNDetectFaceLandmarksRequest");
    expect(source).toContain("VNGeneratePersonSegmentationRequest");
    expect(source).not.toMatch(/recogniz|identity|embedding/i);
  });

  it("uses a Metal-backed Core Image context for rendering", () => {
    expect(source).toContain("MTLCreateSystemDefaultDevice()");
    expect(source).toContain("CIContext(mtlDevice:");
    expect(source).toContain("MTKView");
  });

  it("bounds analysis separately from frame rendering", () => {
    expect(source).toContain("analysisQueue");
    expect(source).toContain("analysisInFlight");
    expect(source).toContain("minimumAnalysisInterval");
    expect(cameraSource).toContain("alwaysDiscardsLateVideoFrames = true");
  });

  it("supports full-resolution still rendering independently of preview", () => {
    expect(source).toContain("renderStillImage");
    expect(source).toContain("quality: .accurate");
    expect(source).toContain("autoreleasepool");
  });

  it("connects the effect view to the existing serialized camera session", () => {
    const camera = cameraSource
      .split("// MARK: - BoothBopCamera")[1]
      .split("// MARK: - BoothBopVideo")[0];
    expect(camera).toContain('CAPPluginMethod(name: "bopFXCapabilities"');
    expect(camera).toContain('CAPPluginMethod(name: "setBopFX"');
    expect(camera).toContain("private var activeBopFX = BopFXEffect.original");
    expect(camera).toContain("sampleBopFXPreviewView?.consume(pixelBuffer)");
    expect(camera).toMatch(
      /BopFXPreviewView\(\s*bopFXFrame: nativePreview\.bounds\)/,
    );
    expect(camera).toContain("bopFXPreviewView?.removeFromSuperview()");
  });
});
