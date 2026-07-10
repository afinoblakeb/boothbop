#!/usr/bin/env node
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const projectRoot = process.cwd();
const projectFile = path.join("ios", "App", "App.xcodeproj");
const scheme = "App";
const configuration = "Release";
const bundleId = process.env.IOS_SMOKE_BUNDLE_ID ?? "com.boothbop.app";
const outputRoot =
  process.env.IOS_SMOKE_OUTPUT ??
  path.join(projectRoot, "ios", "DerivedData", "smoke");
const derivedDataPath = path.join(outputRoot, "DerivedData");
const screenshotDir = path.join(outputRoot, "screenshots");
const appPath = path.join(
  derivedDataPath,
  "Build",
  "Products",
  "Release-iphonesimulator",
  "App.app",
);

const requestedDevices = (
  process.env.IOS_SMOKE_DEVICES ?? "iPhone 17e,iPhone 17,iPhone 17 Pro Max"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

function run(command, args, options = {}) {
  const {
    allowFailure = false,
    capture = false,
    quiet = false,
    timeoutMs = 0,
    timeoutOk = false,
    cwd = projectRoot,
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "pipe",
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timeout;
    let forceKillTimeout;

    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        forceKillTimeout = setTimeout(() => child.kill("SIGKILL"), 2000);
      }, timeoutMs);
    }

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        if (!capture && !quiet) process.stdout.write(text);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (!capture && !quiet) process.stderr.write(text);
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      if (forceKillTimeout) clearTimeout(forceKillTimeout);

      if (timedOut && timeoutOk) {
        resolve({ code, stdout, stderr, timedOut });
        return;
      }

      if (timedOut) {
        reject(
          new Error(
            `Command timed out after ${timeoutMs}ms: ${command} ${args.join(
              " ",
            )}`,
          ),
        );
        return;
      }

      if (code === 0 || allowFailure) {
        resolve({ code, stdout, stderr, timedOut });
        return;
      }

      reject(
        new Error(
          [
            `Command failed (${code}): ${command} ${args.join(" ")}`,
            stdout.trim(),
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  });
}

function parseRuntimeVersion(runtimeKey) {
  const match = runtimeKey.match(/iOS-(\d+)-(\d+)(?:-(\d+))?$/);
  if (!match) return 0;
  const [, major, minor, patch = "0"] = match;
  return Number(major) * 10000 + Number(minor) * 100 + Number(patch);
}

async function availableDevices() {
  const { stdout } = await run(
    "xcrun",
    ["simctl", "list", "devices", "available", "--json"],
    { capture: true },
  );
  const payload = JSON.parse(stdout);
  const devices = [];

  for (const [runtime, runtimeDevices] of Object.entries(payload.devices)) {
    for (const device of runtimeDevices) {
      if (!device.isAvailable) continue;
      devices.push({
        ...device,
        runtime,
        runtimeVersion: parseRuntimeVersion(runtime),
      });
    }
  }

  return devices;
}

async function pickDevices() {
  const devices = await availableDevices();
  const picked = [];

  for (const name of requestedDevices) {
    const matches = devices
      .filter((device) => device.name === name)
      .sort((a, b) => b.runtimeVersion - a.runtimeVersion);

    if (matches.length === 0) {
      throw new Error(
        `Requested simulator "${name}" is not installed. Set IOS_SMOKE_DEVICES to an installed comma-separated device list.`,
      );
    }

    picked.push(matches[0]);
  }

  return picked;
}

async function buildSimulatorApp() {
  process.stdout.write("Syncing Capacitor iOS project... ");
  await run("npm", ["run", "ios:sync"], { capture: true });
  process.stdout.write("done\n");

  process.stdout.write("Building Release simulator app... ");
  await run(
    "xcodebuild",
    [
      "-project",
      projectFile,
      "-scheme",
      scheme,
      "-configuration",
      configuration,
      "-destination",
      "generic/platform=iOS Simulator",
      "-derivedDataPath",
      derivedDataPath,
      "build",
    ],
    { capture: true },
  );
  process.stdout.write("done\n");
}

async function bootDevice(device) {
  await run("xcrun", ["simctl", "boot", device.udid], {
    allowFailure: true,
    quiet: true,
    timeoutMs: 30000,
    timeoutOk: true,
  });

  await run("xcrun", ["simctl", "bootstatus", device.udid, "-b"], {
    quiet: true,
    timeoutMs: 120000,
  });
}

async function screenshotStats(filePath) {
  const image = sharp(filePath).ensureAlpha();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const startY = Math.round(info.height * 0.12);
  const endY = Math.round(info.height * 0.94);
  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  let brightPixels = 0;
  let brandOrangePixels = 0;
  let lightSurfacePixels = 0;
  let maxOrangeRowRatio = 0;

  for (let y = startY; y < endY; y += 1) {
    let rowOrangePixels = 0;
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * channels;
      const luminance =
        0.2126 * data[index] +
        0.7152 * data[index + 1] +
        0.0722 * data[index + 2];

      count += 1;
      sum += luminance;
      sumSquares += luminance * luminance;
      if (luminance > 20) brightPixels += 1;
      if (
        data[index] > 180 &&
        data[index + 1] >= 30 &&
        data[index + 1] <= 130 &&
        data[index + 2] < 100 &&
        data[index] > data[index + 1] * 1.6
      ) {
        brandOrangePixels += 1;
        rowOrangePixels += 1;
      }
      if (data[index] > 210 && data[index + 1] > 190 && data[index + 2] > 150) {
        lightSurfacePixels += 1;
      }
    }
    maxOrangeRowRatio = Math.max(
      maxOrangeRowRatio,
      rowOrangePixels / info.width,
    );
  }

  const average = sum / count;
  const variance = sumSquares / count - average * average;
  const standardDeviation = Math.sqrt(Math.max(0, variance));
  const brightRatio = brightPixels / count;

  return {
    average,
    brandOrangeRatio: brandOrangePixels / count,
    brightRatio,
    lightSurfaceRatio: lightSurfacePixels / count,
    maxOrangeRowRatio,
    standardDeviation,
    width: info.width,
    height: info.height,
  };
}

function assertVisibleScreen(deviceName, stats) {
  if (stats.average < 12 && stats.brightRatio < 0.02) {
    throw new Error(
      `${deviceName} rendered a black screen: average luminance ${stats.average.toFixed(
        2,
      )}, bright ratio ${(stats.brightRatio * 100).toFixed(2)}%.`,
    );
  }

  if (stats.standardDeviation < 6) {
    throw new Error(
      `${deviceName} rendered a visually blank screen: luminance standard deviation ${stats.standardDeviation.toFixed(
        2,
      )}.`,
    );
  }

  // The native launch screen is intentionally darker than the loaded home
  // surface. Requiring the light home luminance proves WKWebView advanced past
  // splash instead of accepting any nonblack native frame.
  if (stats.average < 150) {
    throw new Error(
      `${deviceName} did not advance past the launch screen: average luminance ${stats.average.toFixed(
        2,
      )}.`,
    );
  }

  if (
    stats.brandOrangeRatio < 0.003 ||
    stats.lightSurfaceRatio < 0.35 ||
    stats.maxOrangeRowRatio < 0.45
  ) {
    throw new Error(
      `${deviceName} did not render the BoothBop home surface: orange ratio ${(
        stats.brandOrangeRatio * 100
      ).toFixed(2)}%, light surface ratio ${(
        stats.lightSurfaceRatio * 100
      ).toFixed(2)}%, widest orange row ${(
        stats.maxOrangeRowRatio * 100
      ).toFixed(2)}%.`,
    );
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureVisibleScreenshot(device, screenshot) {
  const deadline = Date.now() + 90000;
  let lastError;

  while (Date.now() < deadline) {
    await run(
      "xcrun",
      ["simctl", "io", device.udid, "screenshot", screenshot],
      {
        quiet: true,
        timeoutMs: 30000,
      },
    );

    const stats = await screenshotStats(screenshot);

    try {
      assertVisibleScreen(device.name, stats);
      return stats;
    } catch (error) {
      lastError = error;
      await sleep(2500);
    }
  }

  if (lastError) throw lastError;
  throw new Error(
    `${device.name} never produced a screenshot before the launch timeout.`,
  );
}

async function recentNativeLog(device) {
  const failureEvents = [
    'eventMessage CONTAINS[c] "Unknown class"',
    'eventMessage CONTAINS[c] "BridgeViewController"',
    'eventMessage CONTAINS[c] "customModule"',
    'eventMessage CONTAINS[c] "Could not load NIB"',
    'eventMessage CONTAINS[c] "NSInvalidUnarchiveOperationException"',
    'eventMessage CONTAINS[c] "Terminating app due to uncaught exception"',
    'eventMessage CONTAINS[c] "Fatal error"',
  ].join(" OR ");
  const predicate = `process == "App" AND (${failureEvents})`;

  const { stdout, stderr } = await run(
    "xcrun",
    [
      "simctl",
      "spawn",
      device.udid,
      "log",
      "show",
      "--last",
      "60s",
      "--style",
      "compact",
      "--predicate",
      predicate,
    ],
    { capture: true, allowFailure: true, timeoutMs: 30000, timeoutOk: true },
  );

  return `${stdout}\n${stderr}`.trim();
}

async function assertNoNativeLaunchFailures(device) {
  const log = await recentNativeLog(device);
  if (!log) return;

  const failurePattern =
    /Unknown class|BridgeViewController|customModule|Could not load NIB|NSInvalidUnarchiveOperationException|Terminating app due to uncaught exception|Fatal error/i;
  if (failurePattern.test(log)) {
    throw new Error(
      `${device.name} emitted native launch failure logs:\n${log}`,
    );
  }
}

async function testDevice(device) {
  const label = `${device.name} (${device.runtime.replace(
    "com.apple.CoreSimulator.SimRuntime.",
    "",
  )})`;
  console.log(`\n==> ${label}`);

  try {
    process.stdout.write("booting... ");
    await bootDevice(device);
    process.stdout.write("ready\n");
    await run("xcrun", ["simctl", "terminate", device.udid, bundleId], {
      allowFailure: true,
      quiet: true,
      timeoutMs: 15000,
      timeoutOk: true,
    });
    await run("xcrun", ["simctl", "uninstall", device.udid, bundleId], {
      allowFailure: true,
      quiet: true,
      timeoutMs: 15000,
      timeoutOk: true,
    });

    let installError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        process.stdout.write(`installing (attempt ${attempt})... `);
        await run("xcrun", ["simctl", "install", device.udid, appPath], {
          quiet: true,
          timeoutMs: 120000,
        });
        process.stdout.write("done\n");
        installError = undefined;
        break;
      } catch (error) {
        process.stdout.write("failed\n");
        installError = error;
        if (attempt === 1) {
          await run("xcrun", ["simctl", "shutdown", device.udid], {
            allowFailure: true,
            quiet: true,
            timeoutMs: 30000,
            timeoutOk: true,
          });
          await bootDevice(device);
        }
      }
    }
    if (installError) throw installError;

    const safeName = device.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const screenshot = path.join(screenshotDir, `${safeName}.png`);
    let launchError;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        process.stdout.write(`launching (attempt ${attempt})... `);
        const launched = await run(
          "xcrun",
          [
            "simctl",
            "launch",
            "--terminate-running-process",
            device.udid,
            bundleId,
          ],
          {
            quiet: true,
            timeoutMs: 45000,
          },
        );
        if (
          !new RegExp(`${bundleId.replaceAll(".", "\\.")}:\\s*\\d+`).test(
            launched.stdout,
          )
        ) {
          throw new Error(
            `simctl launch did not return a PID: ${launched.stdout.trim()}`,
          );
        }
        process.stdout.write("done\n");
        launchError = undefined;
        break;
      } catch (error) {
        launchError = error;
        process.stdout.write("failed\n");
        if (attempt === 1) {
          await run("xcrun", ["simctl", "shutdown", device.udid], {
            allowFailure: true,
            quiet: true,
            timeoutMs: 30000,
            timeoutOk: true,
          });
          await bootDevice(device);
        }
      }
    }
    if (launchError) throw launchError;

    await sleep(1500);

    const stats = await captureVisibleScreenshot(device, screenshot);
    await assertNoNativeLaunchFailures(device);

    console.log(
      `visible ${stats.width}x${stats.height} avg=${stats.average.toFixed(
        1,
      )} stddev=${stats.standardDeviation.toFixed(1)} orange=${(
        stats.brandOrangeRatio * 100
      ).toFixed(1)}% screenshot=${screenshot}`,
    );
  } finally {
    await run("xcrun", ["simctl", "terminate", device.udid, bundleId], {
      allowFailure: true,
      quiet: true,
      timeoutMs: 15000,
      timeoutOk: true,
    });
    await run("xcrun", ["simctl", "shutdown", device.udid], {
      allowFailure: true,
      quiet: true,
      timeoutMs: 30000,
      timeoutOk: true,
    });
  }
}

async function main() {
  if (requestedDevices.length === 0) {
    throw new Error("No devices requested.");
  }

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(screenshotDir, { recursive: true });

  const devices = await pickDevices();
  console.log(
    `Running iOS smoke test for ${devices
      .map((device) => device.name)
      .join(", ")}`,
  );

  for (const device of devices) {
    await run("xcrun", ["simctl", "shutdown", device.udid], {
      allowFailure: true,
      quiet: true,
      timeoutMs: 30000,
      timeoutOk: true,
    });
  }

  await buildSimulatorApp();

  for (const device of devices) {
    await testDevice(device);
  }

  console.log("\niOS smoke test passed.");
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
