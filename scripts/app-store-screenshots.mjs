#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import {
  APP_STORE_SCREENSHOT_DEVICES,
  APP_STORE_SCREENSHOT_SCENES,
  expectedScreenshotCount,
} from "./lib/app-store-screenshot-contract.mjs";

const ROOT = process.cwd();
const HOST = "127.0.0.1";
const PORT = 4174;
const BASE_URL = `http://${HOST}:${PORT}`;
const OUTPUT_ROOT = path.join(ROOT, "build", "app-store", "screenshots");
const CAMERA_FIXTURE = path.join(
  ROOT,
  "build",
  "app-store",
  "sample-camera.y4m",
);
const SAMPLE_CAMERA_PHOTO = path.join(ROOT, "public", "demo", "set1-1.jpg");

function run(command, args, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stderr = "";
    if (quiet) child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

async function waitForServer(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready at ${BASE_URL}.`);
}

async function createCameraFixture() {
  await mkdir(path.dirname(CAMERA_FIXTURE), { recursive: true });
  await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-loop",
      "1",
      "-i",
      SAMPLE_CAMERA_PHOTO,
      "-vf",
      "scale=640:640:force_original_aspect_ratio=increase,crop=640:640",
      "-t",
      "6",
      "-r",
      "5",
      "-pix_fmt",
      "yuv420p",
      CAMERA_FIXTURE,
    ],
    { quiet: true },
  );
}

async function waitForRenderedImages(page) {
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}

async function preparePage(context) {
  const page = await context.newPage();
  const applicationErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      applicationErrors.push(`console.error: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    applicationErrors.push(
      `pageerror (${error.name || "Error"}): ${
        error.stack || error.message || String(error)
      }`,
    );
  });
  await page.route(/https:\/\/boothbop\.com\/config\/v1\.json.*/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: 1,
        revision: 1,
        features: {
          editor: true,
          gif: true,
          video: true,
          boom: true,
          retakeOne: true,
          brandingControl: true,
        },
      }),
    }),
  );
  await page.addInitScript(() => {
    localStorage.setItem("bb.lastSeenRelease", "0.0.4");
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => undefined,
    });
  });
  return { page, applicationErrors };
}

async function capture(page, outputDirectory, fileName) {
  const demoControls = page.getByTestId("demo-controls");
  const hidDemoControls = await demoControls
    .evaluate((element) => {
      element.style.display = "none";
      return true;
    })
    .catch(() => false);
  await waitForRenderedImages(page);
  await page.screenshot({
    path: path.join(outputDirectory, fileName),
    animations: "disabled",
  });
  if (hidDemoControls) {
    await demoControls.evaluate((element) => {
      element.style.removeProperty("display");
    });
  }
}

async function captureDevice(browser, device) {
  const outputDirectory = path.join(OUTPUT_ROOT, device.label);
  await mkdir(outputDirectory, { recursive: true });
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.scale,
    isMobile: true,
    hasTouch: true,
    permissions: ["camera"],
    serviceWorkers: "block",
  });
  const { page, applicationErrors } = await preparePage(context);

  try {
    await page.goto(BASE_URL);
    await page.getByRole("button", { name: "Take Photos" }).click();
    await page.waitForFunction(() => {
      const video = document.querySelector("video");
      return (
        video instanceof HTMLVideoElement &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      );
    });
    await capture(page, outputDirectory, "1-camera.png");

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Take Photos" }).waitFor();
    await page.getByRole("button", { name: "Demo Gallery" }).click();
    await page
      .getByRole("button", { name: "Open photo set" })
      .first()
      .waitFor();
    await capture(page, outputDirectory, "5-my-photos.png");
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Demo 1" }).click();
    await page.getByRole("img", { name: "Your strip" }).waitFor();
    await capture(page, outputDirectory, "2-classic-strip.png");

    await page.getByRole("button", { name: "Edit" }).click();
    const editor = page.getByRole("dialog", { name: "Edit photos" });
    await editor.getByRole("button", { name: "Warm", exact: true }).click();
    await capture(page, outputDirectory, "3-looks.png");
    await editor.getByRole("button", { name: "Done" }).click();

    await page.getByRole("tab", { name: "GIF" }).click();
    await page.getByRole("img", { name: "Your gif" }).waitFor({
      state: "visible",
      timeout: 60_000,
    });
    await page.getByRole("switch", { name: "Boom" }).click();
    await page.getByRole("img", { name: "Your gif" }).waitFor({
      state: "visible",
      timeout: 60_000,
    });
    await capture(page, outputDirectory, "4-gif-boom.png");

    if (applicationErrors.length) {
      throw new Error(applicationErrors.join("\n"));
    }
  } finally {
    await context.close();
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

  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await createCameraFixture();
  await run("npm", ["run", "build:demo"]);

  const preview = spawn(
    "npm",
    ["run", "preview", "--", "--host", HOST, "--port", String(PORT)],
    {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  preview.stdout.pipe(process.stdout);
  preview.stderr.pipe(process.stderr);

  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch({
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-video-capture=${CAMERA_FIXTURE}`,
      ],
    });
    for (const device of APP_STORE_SCREENSHOT_DEVICES) {
      process.stdout.write(`Capturing ${device.label}...\n`);
      await captureDevice(browser, device);
    }
    const manifest = await validateScreenshots();
    process.stdout.write(
      `Generated and validated ${manifest.length} screenshots in ${OUTPUT_ROOT}.\n`,
    );
  } finally {
    if (browser) await browser.close();
    preview.kill("SIGTERM");
  }
}

await main();
