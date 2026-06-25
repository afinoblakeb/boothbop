import { describe, expect, it } from "vitest";
import {
  IMPORT_FRAME_COUNT,
  pickImportFiles,
  validateImportFiles,
} from "./importPhotos";

function file(name: string, type: string): File {
  return new File(["x"], name, { type });
}

describe("import photo helpers", () => {
  it("requires four frames", () => {
    expect(IMPORT_FRAME_COUNT).toBe(4);
  });

  it("keeps only image files and caps at four", () => {
    const picked = pickImportFiles([
      file("a.jpg", "image/jpeg"),
      file("notes.txt", "text/plain"),
      file("b.png", "image/png"),
      file("c.heic", "image/heic"),
      file("d.webp", "image/webp"),
      file("e.gif", "image/gif"),
    ]);
    expect(picked.map((f) => f.name)).toEqual([
      "a.jpg",
      "b.png",
      "c.heic",
      "d.webp",
    ]);
  });

  it("reports a useful error when too few photos are selected", () => {
    expect(validateImportFiles([file("a.jpg", "image/jpeg")])).toBe(
      "Choose 4 photos to import.",
    );
  });

  it("accepts four image files", () => {
    expect(
      validateImportFiles([
        file("a.jpg", "image/jpeg"),
        file("b.jpg", "image/jpeg"),
        file("c.jpg", "image/jpeg"),
        file("d.jpg", "image/jpeg"),
      ]),
    ).toBeNull();
  });
});
