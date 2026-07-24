import { describe, expect, it } from "vitest";
import {
  assertBopFXFixtureReport,
  expectedBopFXEffects,
  pickBopFXSimulator,
} from "./bopfx-fixture-contract.mjs";

function validReport() {
  return [
    ...expectedBopFXEffects.map((effect) => ({
      effect,
      rendered: true,
      recording: `${effect}.mp4`,
    })),
    {
      effect: "livingStrip",
      rendered: true,
      livingStripRecording: "living-strip.mp4",
    },
  ];
}

describe("BopFX fixture report contract", () => {
  it("accepts all rendered effects and the living strip", () => {
    expect(() => assertBopFXFixtureReport(validReport())).not.toThrow();
  });

  it("rejects a missing or failed effect", () => {
    expect(() =>
      assertBopFXFixtureReport(
        validReport().filter(({ effect }) => effect !== "spinCycle"),
      ),
    ).toThrow(/spinCycle/);

    const failed = validReport();
    failed[1] = { effect: "spectralEcho", rendered: false };
    expect(() => assertBopFXFixtureReport(failed)).toThrow(/spectralEcho/);
  });

  it("rejects a missing living-strip recording", () => {
    const report = validReport();
    report[report.length - 1] = {
      effect: "livingStrip",
      rendered: true,
    };
    expect(() => assertBopFXFixtureReport(report)).toThrow(
      /living-strip recording/,
    );
  });
});

describe("BopFX simulator selection", () => {
  const devices = [
    { name: "Apple Watch Series 11", state: "Booted", udid: "WATCH" },
    { name: "iPhone 17 Pro", state: "Shutdown", udid: "PHONE-1" },
    { name: "iPhone 17", state: "Booted", udid: "PHONE-2" },
  ];

  it("prefers an already-booted iPhone over another booted platform", () => {
    expect(pickBopFXSimulator(devices)).toMatchObject({
      udid: "PHONE-2",
    });
  });

  it("honors an explicit available iPhone", () => {
    expect(pickBopFXSimulator(devices, "PHONE-1")).toMatchObject({
      udid: "PHONE-1",
    });
  });

  it("rejects a requested non-iPhone simulator", () => {
    expect(() => pickBopFXSimulator(devices, "WATCH")).toThrow(
      /not an available iPhone simulator/,
    );
  });
});
