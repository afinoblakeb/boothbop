export interface PartyModeConfig {
  enabled: boolean;
  passcode: string;
}

export const PARTY_PASSCODE_LENGTH = 4;
export const PARTY_DEFAULT_PASSCODE = "0000";

const KEYS = {
  enabled: "bb.party.enabled",
  passcode: "bb.party.passcode",
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

export function loadPartyModeConfig(): PartyModeConfig {
  return {
    enabled: localStorage.getItem(KEYS.enabled) === "1",
    passcode: normalizePartyPasscode(localStorage.getItem(KEYS.passcode)),
  };
}

export function savePartyModeConfig(config: PartyModeConfig): void {
  localStorage.setItem(KEYS.enabled, config.enabled ? "1" : "0");
  localStorage.setItem(KEYS.passcode, cleanPartyPasscodeInput(config.passcode));
}

export function verifyPartyPasscode(
  config: PartyModeConfig,
  input: string,
): boolean {
  return (
    cleanPartyPasscodeInput(input) === normalizePartyPasscode(config.passcode)
  );
}
