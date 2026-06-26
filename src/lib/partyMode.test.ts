import { beforeEach, describe, expect, it } from "vitest";
import {
  PARTY_DEFAULT_PASSCODE,
  cleanPartyPasscodeInput,
  loadPartyModeConfig,
  normalizePartyPasscode,
  savePartyModeConfig,
  verifyPartyPasscode,
} from "./partyMode";

beforeEach(() => localStorage.clear());

describe("partyMode", () => {
  it("defaults disabled with the fallback passcode", () => {
    expect(loadPartyModeConfig()).toEqual({
      enabled: false,
      passcode: PARTY_DEFAULT_PASSCODE,
    });
  });

  it("round-trips an enabled config", () => {
    savePartyModeConfig({ enabled: true, passcode: "1234" });
    expect(loadPartyModeConfig()).toEqual({
      enabled: true,
      passcode: "1234",
    });
  });

  it("normalizes invalid stored passcodes to the default", () => {
    expect(normalizePartyPasscode("12")).toBe(PARTY_DEFAULT_PASSCODE);
    expect(normalizePartyPasscode("abcd")).toBe(PARTY_DEFAULT_PASSCODE);
    expect(normalizePartyPasscode(null)).toBe(PARTY_DEFAULT_PASSCODE);
    expect(normalizePartyPasscode("12345")).toBe("1234");
  });

  it("cleans passcode input without accepting partial codes", () => {
    expect(cleanPartyPasscodeInput("a1 b2 c3 d4 e5")).toBe("1234");
    expect(cleanPartyPasscodeInput("99")).toBe("99");
  });

  it("verifies the passcode exactly after input cleanup", () => {
    const config = { enabled: true, passcode: "2468" };
    expect(verifyPartyPasscode(config, "2468")).toBe(true);
    expect(verifyPartyPasscode(config, "24 68")).toBe(true);
    expect(verifyPartyPasscode(config, "246")).toBe(false);
    expect(verifyPartyPasscode(config, "2469")).toBe(false);
  });
});
