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

  it("maps denial to simctl's revoke action for the recoverable error journey", () => {
    expect(
      simulatorCameraPrivacyArgs("DEVICE-2", "com.boothbop.app", "deny"),
    ).toEqual([
      "simctl",
      "privacy",
      "DEVICE-2",
      "revoke",
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
