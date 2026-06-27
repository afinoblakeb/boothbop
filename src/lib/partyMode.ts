export interface PartyModeConfig {
  enabled: boolean;
  passcode: string;
  resetSeconds: PartyResetSeconds;
}

export const PARTY_PASSCODE_LENGTH = 4;
export const PARTY_DEFAULT_PASSCODE = "0000";
export const PARTY_RESET_SECONDS = [0, 15, 30, 60] as const;
export type PartyResetSeconds = (typeof PARTY_RESET_SECONDS)[number];

const KEYS = {
  enabled: "bb.party.enabled",
  passcode: "bb.party.passcode",
  resetSeconds: "bb.party.resetSeconds",
} as const;

export function normalizePartyPasscode(value: string | null): string {
  const digits = (value ?? "")
    .replace(/\D/g, "")
    .slice(0, PARTY_PASSCODE_LENGTH);
  return digits.length === PARTY_PASSCODE_LENGTH
    ? digits
    : PARTY_DEFAULT_PASSCODE;
}

export function cleanPartyPasscodeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, PARTY_PASSCODE_LENGTH);
}

export function normalizePartyResetSeconds(
  value: string | number | null,
): PartyResetSeconds {
  const seconds = Number(value);
  return PARTY_RESET_SECONDS.includes(seconds as PartyResetSeconds)
    ? (seconds as PartyResetSeconds)
    : 0;
}

export function loadPartyModeConfig(): PartyModeConfig {
  return {
    enabled: localStorage.getItem(KEYS.enabled) === "1",
    passcode: normalizePartyPasscode(localStorage.getItem(KEYS.passcode)),
    resetSeconds: normalizePartyResetSeconds(
      localStorage.getItem(KEYS.resetSeconds),
    ),
  };
}

export function savePartyModeConfig(config: PartyModeConfig): void {
  localStorage.setItem(KEYS.enabled, config.enabled ? "1" : "0");
  localStorage.setItem(KEYS.passcode, cleanPartyPasscodeInput(config.passcode));
  localStorage.setItem(
    KEYS.resetSeconds,
    String(normalizePartyResetSeconds(config.resetSeconds)),
  );
}

export function isGuestModeActive(config: PartyModeConfig): boolean {
  return config.enabled;
}

export function verifyPartyPasscode(
  config: PartyModeConfig,
  input: string,
): boolean {
  return (
    cleanPartyPasscodeInput(input) === normalizePartyPasscode(config.passcode)
  );
}
