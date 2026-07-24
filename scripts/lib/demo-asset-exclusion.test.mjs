import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { removeDemoAssetsFromProduction } from "./demo-asset-exclusion";

const temporaryDirectories = [];

async function makeBundle() {
  const root = await mkdtemp(path.join(os.tmpdir(), "boothbop-bundle-"));
  temporaryDirectories.push(root);
  await mkdir(path.join(root, "demo"), { recursive: true });
  await writeFile(path.join(root, "demo", "sample.jpg"), "sample");
  await writeFile(path.join(root, "index.html"), "app");
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("demo asset exclusion", () => {
  it("removes staged photos from a production bundle", async () => {
    const root = await makeBundle();

    await removeDemoAssetsFromProduction(root, false);

    await expect(
      readFile(path.join(root, "demo", "sample.jpg")),
    ).rejects.toThrow(/ENOENT/);
    await expect(readFile(path.join(root, "index.html"), "utf8")).resolves.toBe(
      "app",
    );
  });

  it("preserves staged photos in an explicit screenshot build", async () => {
    const root = await makeBundle();

    await removeDemoAssetsFromProduction(root, true);

    await expect(
      readFile(path.join(root, "demo", "sample.jpg"), "utf8"),
    ).resolves.toBe("sample");
  });
});
