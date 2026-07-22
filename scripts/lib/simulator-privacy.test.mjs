import { describe, expect, it } from "vitest";
import { simulatorCameraGrantArgs } from "./simulator-privacy.mjs";

describe("simulator camera privacy", () => {
  it("builds an explicit camera grant before native launch", () => {
    expect(simulatorCameraGrantArgs("DEVICE-1", "com.boothbop.app")).toEqual([
      "simctl",
      "privacy",
      "DEVICE-1",
      "grant",
      "camera",
      "com.boothbop.app",
    ]);
  });
});
