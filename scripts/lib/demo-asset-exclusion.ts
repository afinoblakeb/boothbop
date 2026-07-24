import { rm } from "node:fs/promises";
import path from "node:path";

export async function removeDemoAssetsFromProduction(
  outputDirectory: string,
  isDemoBuild: boolean,
): Promise<void> {
  if (isDemoBuild) return;
  await rm(path.join(outputDirectory, "demo"), {
    recursive: true,
    force: true,
  });
}
