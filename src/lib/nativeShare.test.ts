import { describe, expect, it } from "vitest";
import { uniqueShareFilename } from "./nativeShare";

describe("native share cache files", () => {
  it("uses a unique path for repeated shares in the same second", () => {
    expect(uniqueShareFilename("boothbop.gif", "first")).toBe(
      "first-boothbop.gif",
    );
    expect(uniqueShareFilename("boothbop.gif", "second")).not.toBe(
      uniqueShareFilename("boothbop.gif", "first"),
    );
  });
});
