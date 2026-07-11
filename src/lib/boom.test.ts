import { beforeEach, describe, expect, it } from "vitest";
import {
  BOOM_DEFAULT_SPEED,
  boomFrameDelay,
  loadBoomSpeed,
  saveBoomSpeed,
} from "./boom";

beforeEach(() => localStorage.clear());

describe("Boom speed", () => {
  it("defaults to a fast animation", () => {
    expect(loadBoomSpeed()).toBe(BOOM_DEFAULT_SPEED);
    expect(boomFrameDelay(BOOM_DEFAULT_SPEED)).toBeLessThanOrEqual(180);
  });

  it("maps faster controls to shorter frame delays", () => {
    expect(boomFrameDelay(3)).toBeLessThan(boomFrameDelay(2));
    expect(boomFrameDelay(2)).toBeLessThan(boomFrameDelay(1));
  });

  it("persists valid speeds and rejects corrupt values", () => {
    saveBoomSpeed(2);
    expect(loadBoomSpeed()).toBe(2);
    localStorage.setItem("bb.boomSpeed", "99");
    expect(loadBoomSpeed()).toBe(BOOM_DEFAULT_SPEED);
  });
});
