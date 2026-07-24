import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("scripts/ios-smoke.mjs", "utf8");

describe("iOS smoke harness source contract", () => {
  it("allows a cold iOS simulator launch to outlive the visual readiness window", () => {
    expect(source).toContain("IOS_SMOKE_LAUNCH_TIMEOUT_MS");
    expect(source).toContain("const launchTimeoutMs");
    expect(source).toContain("timeoutMs: launchTimeoutMs");
  });
});
