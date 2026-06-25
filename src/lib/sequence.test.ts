import { describe, expect, it } from "vitest";
import { moveItem } from "./sequence";

describe("moveItem", () => {
  it("moves an item earlier or later by one slot", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("returns a copy unchanged when the move is out of bounds", () => {
    const input = ["a", "b", "c"];
    const moved = moveItem(input, 0, -1);
    expect(moved).toEqual(input);
    expect(moved).not.toBe(input);
    expect(moveItem(input, 3, 1)).toEqual(input);
  });
});
