import { storageGet, storageSet } from "./safeStorage";

export type BoomSpeed = 1 | 2 | 3;

export const BOOM_DEFAULT_SPEED: BoomSpeed = 3;

const BOOM_SPEED_KEY = "bb.boomSpeed";
const FRAME_DELAYS: Record<BoomSpeed, number> = {
  1: 420,
  2: 260,
  3: 160,
};

export function boomFrameDelay(speed: BoomSpeed): number {
  return FRAME_DELAYS[speed];
}

export function loadBoomSpeed(): BoomSpeed {
  const stored = Number(storageGet(BOOM_SPEED_KEY));
  return stored === 1 || stored === 2 || stored === 3
    ? stored
    : BOOM_DEFAULT_SPEED;
}

export function saveBoomSpeed(speed: BoomSpeed): void {
  storageSet(BOOM_SPEED_KEY, String(speed));
}
