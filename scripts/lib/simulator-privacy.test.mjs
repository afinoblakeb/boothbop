import { describe, expect, it } from "vitest";
import { simulatorCameraPrivacyArgs } from "./simulator-privacy.mjs";

describe("simulator camera privacy", () => {
  it("builds an explicit camera grant before native launch", () => {
    expect(
      simulatorCameraPrivacyArgs("DEVICE-1", "com.boothbop.app", "grant"),
    ).toEqual([
      "simctl",
      "privacy",
      "DEVICE-1",
      "grant",
      "camera",
      "com.boothbop.app",
    ]);
  });

  it("builds an explicit denial for the recoverable error journey", () => {
    expect(
      simulatorCameraPrivacyArgs("DEVICE-2", "com.boothbop.app", "deny"),
    ).toEqual([
      "simctl",
      "privacy",
      "DEVICE-2",
      "deny",
      "camera",
      "com.boothbop.app",
    ]);
  });

  it("rejects unsupported privacy decisions", () => {
    expect(() =>
      simulatorCameraPrivacyArgs("DEVICE-3", "com.boothbop.app", "reset"),
    ).toThrow(/grant or deny/);
  });
});
