import { beforeEach, describe, expect, it } from "vitest";
import {
  PARTY_DEFAULT_PASSCODE,
  GUEST_OUTPUT_FORMATS,
  PARTY_RESET_SECONDS,
  cleanPartyPasscodeInput,
  guestGalleryCountLabel,
  loadPartyModeConfig,
  isGuestModeActive,
  normalizeGuestOutputFormat,
  normalizePartyPasscode,
  normalizePartyResetSeconds,
  savePartyModeConfig,
  verifyPartyPasscode,
  type PartyModeConfig,
} from "./partyMode";

beforeEach(() => localStorage.clear());

describe("partyMode", () => {
  it("defaults disabled with the fallback passcode", () => {
    expect(loadPartyModeConfig()).toEqual({
      enabled: false,
      passcode: PARTY_DEFAULT_PASSCODE,
      resetSeconds: 0,
      outputFormat: "strip",
    });
  });

  it("round-trips an enabled config", () => {
    savePartyModeConfig({
      enabled: true,
      passcode: "1234",
      resetSeconds: 30,
      outputFormat: "boomerang",
    });
    expect(loadPartyModeConfig()).toEqual({
      enabled: true,
      passcode: "1234",
      resetSeconds: 30,
      outputFormat: "boomerang",
    });
  });

  it("keeps basic guest mode active without a Pro entitlement check", () => {
    const config: PartyModeConfig = {
      enabled: true,
      passcode: "1234",
      resetSeconds: 15,
      outputFormat: "strip",
    };

    expect(isGuestModeActive(config)).toBe(true);
  });

  it("labels the local gallery save count for guest setup", () => {
    expect(guestGalleryCountLabel(null)).toBe("Checking BoothBop Gallery.");
    expect(guestGalleryCountLabel(0)).toBe("0 saved sets in BoothBop Gallery.");
    expect(guestGalleryCountLabel(1)).toBe("1 saved set in BoothBop Gallery.");
    expect(guestGalleryCountLabel(4)).toBe("4 saved sets in BoothBop Gallery.");
  });

  it("documents and normalizes auto-reset seconds", () => {
    expect(PARTY_RESET_SECONDS).toEqual([0, 15, 30, 60]);
    expect(normalizePartyResetSeconds("15")).toBe(15);
    expect(normalizePartyResetSeconds(60)).toBe(60);
    expect(normalizePartyResetSeconds("45")).toBe(0);
    expect(normalizePartyResetSeconds(null)).toBe(0);
  });

  it("documents and normalizes guest output formats", () => {
    expect(GUEST_OUTPUT_FORMATS).toEqual([
      "strip",
      "gif",
      "boomerang",
      "video",
    ]);
    expect(normalizeGuestOutputFormat("gif")).toBe("gif");
    expect(normalizeGuestOutputFormat("boomerang")).toBe("boomerang");
    expect(normalizeGuestOutputFormat("print")).toBe("strip");
    expect(normalizeGuestOutputFormat(null)).toBe("strip");
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
    const config: PartyModeConfig = {
      enabled: true,
      passcode: "2468",
      resetSeconds: 0,
      outputFormat: "strip",
    };
    expect(verifyPartyPasscode(config, "2468")).toBe(true);
    expect(verifyPartyPasscode(config, "24 68")).toBe(true);
    expect(verifyPartyPasscode(config, "246")).toBe(false);
    expect(verifyPartyPasscode(config, "2469")).toBe(false);
  });
});
