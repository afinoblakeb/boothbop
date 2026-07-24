import { describe, expect, it } from "vitest";
import {
  BOPFX_EFFECTS,
  availableBopFXEffects,
  bopFXPhase,
  isBopFXId,
  loadBopFX,
  saveBopFX,
  type BopFXCapabilities,
} from "./bopfx";

const fullCapabilities: BopFXCapabilities = {
  nativePreview: true,
  faceLandmarks: true,
  personSegmentation: true,
  metalRendering: true,
  arFaceTracking: true,
  maximumTrackedFaces: 3,
  trueDepthCamera: true,
  depthStream: true,
  effects: [
    "original",
    "spectralEcho",
    "funhouse",
    "cutoutChorus",
    "mirrorBloom",
    "spinCycle",
  ],
};

describe("BopFX contract", () => {
  it("keeps Original first and exposes a small curated catalog", () => {
    expect(BOPFX_EFFECTS.map(({ id }) => id)).toEqual([
      "original",
      "spectralEcho",
      "funhouse",
      "cutoutChorus",
      "mirrorBloom",
      "spinCycle",
    ]);
  });

  it("omits effects whose native inputs are unavailable", () => {
    expect(
      availableBopFXEffects({
        ...fullCapabilities,
        personSegmentation: false,
      }).map(({ id }) => id),
    ).toEqual([
      "original",
      "spectralEcho",
      "funhouse",
      "mirrorBloom",
      "spinCycle",
    ]);

    expect(
      availableBopFXEffects({
        nativePreview: false,
        faceLandmarks: false,
        personSegmentation: false,
        metalRendering: false,
        arFaceTracking: false,
        maximumTrackedFaces: 0,
        trueDepthCamera: false,
        depthStream: false,
        effects: ["original"],
      }).map(({ id }) => id),
    ).toEqual(["original"]);
  });

  it("honors a native per-effect support list", () => {
    expect(
      availableBopFXEffects({
        ...fullCapabilities,
        effects: ["original", "spectralEcho"],
      }).map(({ id }) => id),
    ).toEqual(["original", "spectralEcho"]);
  });

  it("keeps Spin Cycle available without face analysis", () => {
    const spin = BOPFX_EFFECTS.find(({ id }) => id === "spinCycle");
    expect(spin).toMatchObject({
      requiresFaceLandmarks: false,
      requiresPersonSegmentation: false,
    });
    expect(
      availableBopFXEffects({
        ...fullCapabilities,
        faceLandmarks: false,
      }).map(({ id }) => id),
    ).toContain("spinCycle");
  });

  it("rejects unknown persisted effect ids", () => {
    localStorage.setItem("bb.bopfx", "futureEffect");
    expect(loadBopFX()).toBe("original");
    expect(isBopFXId("futureEffect")).toBe(false);
  });

  it("persists a valid deliberate selection", () => {
    saveBopFX("spectralEcho");
    expect(loadBopFX()).toBe("spectralEcho");
  });

  it("assigns a deterministic loop phase to each captured frame", () => {
    expect([0, 1, 2, 3].map((index) => bopFXPhase(index, 4))).toEqual([
      0, 0.25, 0.5, 0.75,
    ]);
    expect(bopFXPhase(7, 4)).toBe(0.75);
    expect(bopFXPhase(-1, 4)).toBe(0);
    expect(bopFXPhase(0, 0)).toBe(0);
  });
});
