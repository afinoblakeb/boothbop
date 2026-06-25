import { beforeEach, describe, expect, it } from "vitest";
import { FILTERS, loadFilter, motionSequence, saveFilter } from "./render";

beforeEach(() => localStorage.clear());

describe("filter settings", () => {
  it("defaults to original when storage is empty", () => {
    expect(loadFilter()).toBe("none");
  });

  it("round-trips a selected look", () => {
    saveFilter("vintage");
    expect(loadFilter()).toBe("vintage");
  });

  it("treats unknown stored looks as original", () => {
    localStorage.setItem("bb.filter", "bad-look");
    expect(loadFilter()).toBe("none");
  });

  it("exposes user-facing filter labels", () => {
    expect(Object.keys(FILTERS)).toEqual([
      "none",
      "mono",
      "warm",
      "glam",
      "vintage",
    ]);
    for (const f of Object.values(FILTERS)) {
      expect(f.label.length).toBeGreaterThan(0);
    }
  });
});

describe("motionSequence", () => {
  it("leaves a standard loop in capture order", () => {
    expect(motionSequence([1, 2, 3, 4], "loop")).toEqual([1, 2, 3, 4]);
  });

  it("builds a forward/back boomerang without duplicate endpoints", () => {
    expect(motionSequence([1, 2, 3, 4], "boomerang")).toEqual([
      1, 2, 3, 4, 3, 2,
    ]);
  });
});
