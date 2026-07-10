import { describe, expect, it } from "vitest";
import { frameIndexes, replaceFrame } from "./session";

describe("frame sequencing", () => {
  it("loops through frames in their original order", () => {
    expect(frameIndexes(4, false)).toEqual([0, 1, 2, 3]);
  });

  it("plays Boom forward and backward without repeating endpoints", () => {
    expect(frameIndexes(4, true)).toEqual([0, 1, 2, 3, 2, 1]);
    expect(frameIndexes(1, true)).toEqual([0]);
  });
});

describe("replaceFrame", () => {
  it("immutably changes exactly one frame", () => {
    const frames = ["one", "two", "three", "four"];
    const result = replaceFrame(frames, 2, "new");
    expect(result).toEqual(["one", "two", "new", "four"]);
    expect(result).not.toBe(frames);
    expect(frames).toEqual(["one", "two", "three", "four"]);
  });

  it("rejects an invalid frame index", () => {
    expect(() => replaceFrame(["one"], 1, "new")).toThrow(RangeError);
  });
});
