#!/usr/bin/env node
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  APP_STORE_SCREENSHOT_DEVICES,
  APP_STORE_SCREENSHOT_SCENES,
  expectedScreenshotCount,
} from "./lib/app-store-screenshot-contract.mjs";
import {
  officialDevicePlacement,
  simulatorSourceFileName,
} from "./lib/app-store-screenshot-composition.mjs";

const ROOT = process.cwd();
const OUTPUT_ROOT = path.join(ROOT, "build", "app-store", "screenshots");
const SOURCE_ROOT = path.join(ROOT, "build", "app-store", "simulator-source");

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function composeScreenshot(sourceFile, outputFile, device, scene) {
  const sourceMetadata = await sharp(sourceFile).metadata();
  const expectedWindow = device.simulatorWindow;
  if (
    sourceMetadata.width !== expectedWindow.width ||
    sourceMetadata.height !== expectedWindow.height
  ) {
    throw new Error(
      `${sourceFile} is ${sourceMetadata.width}x${sourceMetadata.height}; expected an official ${expectedWindow.width}x${expectedWindow.height} Simulator window capture.`,
    );
  }

  const placement = officialDevicePlacement(device.pixels, expectedWindow.crop);
  const officialDevice = await sharp(sourceFile)
    .extract(expectedWindow.crop)
    .resize(placement.width, placement.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  const titleSize = Math.round(device.pixels.width * 0.058);
  const subtitleSize = Math.round(device.pixels.width * 0.03);
  const titleY = Math.round(device.pixels.height * 0.054);
  const subtitleY = Math.round(device.pixels.height * 0.096);
  const accentHeight = Math.max(10, Math.round(device.pixels.height * 0.005));
  const background = Buffer.from(`
    <svg width="${device.pixels.width}" height="${device.pixels.height}">
      <rect width="100%" height="100%" fill="#f4f5f5"/>
      <rect x="0" y="0" width="${device.pixels.width}"
        height="${accentHeight}" fill="#fc501d"/>
      <text x="50%" y="${titleY}" text-anchor="middle"
        dominant-baseline="middle" fill="#141516"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${titleSize}" font-weight="700">${escapeXml(scene.title)}</text>
      <text x="50%" y="${subtitleY}" text-anchor="middle"
        dominant-baseline="middle" fill="#676a6b"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${subtitleSize}" font-weight="400">${escapeXml(
          scene.subtitle,
        )}</text>
    </svg>
  `);

  await sharp(background)
    .composite([
      {
        input: officialDevice,
        left: placement.left,
        top: placement.top,
      },
    ])
    .flatten({ background: "#f4f5f5" })
    .removeAlpha()
    .png({ palette: false })
    .toFile(outputFile);
}

async function generateScreenshots() {
  await rm(OUTPUT_ROOT, { recursive: true, force: true });

  for (const device of APP_STORE_SCREENSHOT_DEVICES) {
    const outputDirectory = path.join(OUTPUT_ROOT, device.label);
    const sourceDirectory = path.join(SOURCE_ROOT, device.label);
    await mkdir(outputDirectory, { recursive: true });
    process.stdout.write(`Composing official ${device.label} captures...\n`);

    for (const scene of APP_STORE_SCREENSHOT_SCENES) {
      await composeScreenshot(
        path.join(sourceDirectory, simulatorSourceFileName(scene.fileName)),
        path.join(outputDirectory, scene.fileName),
        device,
        scene,
      );
    }
  }
}

async function validateScreenshots() {
  const manifest = [];
  for (const device of APP_STORE_SCREENSHOT_DEVICES) {
    for (const scene of APP_STORE_SCREENSHOT_SCENES) {
      const file = path.join(OUTPUT_ROOT, device.label, scene.fileName);
      const [metadata, fileStats] = await Promise.all([
        sharp(file).metadata(),
        stat(file),
      ]);
      if (
        metadata.width !== device.pixels.width ||
        metadata.height !== device.pixels.height
      ) {
        throw new Error(
          `${file} is ${metadata.width}x${metadata.height}; expected ${device.pixels.width}x${device.pixels.height}.`,
        );
      }
      if (metadata.hasAlpha) {
        throw new Error(`${file} contains an alpha channel.`);
      }
      manifest.push({
        displayType: device.displayType,
        device: device.label,
        source: "official-simulator-window",
        scene: scene.id,
        fileName: scene.fileName,
        width: metadata.width,
        height: metadata.height,
        bytes: fileStats.size,
      });
    }
  }
  if (manifest.length !== expectedScreenshotCount()) {
    throw new Error(
      `Generated ${manifest.length} screenshots; expected ${expectedScreenshotCount()}.`,
    );
  }
  await writeFile(
    path.join(OUTPUT_ROOT, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}

async function main() {
  if (!process.argv.includes("generate")) {
    process.stderr.write("Usage: npm run appstore:screenshots -- generate\n");
    process.exitCode = 1;
    return;
  }

  await generateScreenshots();
  const manifest = await validateScreenshots();
  process.stdout.write(
    `Generated and validated ${manifest.length} official-Simulator screenshots in ${OUTPUT_ROOT}.\n`,
  );
}

await main();
