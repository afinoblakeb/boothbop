#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  assertBopFXFixtureReport,
  expectedBopFXEffects,
  pickBopFXSimulator,
} from "./lib/bopfx-fixture-contract.mjs";

const projectRoot = process.cwd();
const projectFile = path.join("ios", "App", "App.xcodeproj");
const bundleId = "com.boothbop.app";
const outputRoot =
  process.env.BOPFX_FIXTURE_OUTPUT ??
  path.join(projectRoot, "ios", "DerivedData", "bopfx-fixture");
const derivedDataPath = path.join(outputRoot, "DerivedData");
const appPath = path.join(
  derivedDataPath,
  "Build",
  "Products",
  "Debug-iphonesimulator",
  "App.app",
);

function run(command, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || allowFailure) {
        resolve({ code, stdout, stderr });
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

async function chooseSimulator() {
  const requested = process.env.BOPFX_SIMULATOR_UDID;
  const { stdout } = await run("xcrun", [
    "simctl",
    "list",
    "devices",
    "available",
    "--json",
  ]);
  const payload = JSON.parse(stdout);
  const devices = Object.values(payload.devices).flat();
  return pickBopFXSimulator(devices, requested);
}

async function waitForReport(labDirectory) {
  const reportPath = path.join(labDirectory, "report.json");
  const deadline = Date.now() + 180_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const report = JSON.parse(await readFile(reportPath, "utf8"));
      assertBopFXFixtureReport(report);
      return report;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(
    `BopFX fixture did not complete within 180 seconds: ${lastError?.message}`,
  );
}

async function validateArtifacts(labDirectory, report) {
  const recordings = [
    ...expectedBopFXEffects.map((effect) => `${effect}.mp4`),
    report.find(({ effect }) => effect === "livingStrip").livingStripRecording,
  ];
  for (const recording of recordings) {
    const details = await stat(path.join(labDirectory, recording));
    if (details.size < 1024) {
      throw new Error(`${recording} is unexpectedly small`);
    }
  }

  const probe = await run("which", ["ffprobe"], { allowFailure: true });
  if (probe.code !== 0) return;
  const livingStripPath = path.join(labDirectory, "living-strip.mp4");
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-show_entries",
    "stream=codec_name,width,height,r_frame_rate",
    "-of",
    "json",
    livingStripPath,
  ]);
  const payload = JSON.parse(stdout);
  const stream = payload.streams?.[0];
  const duration = Number(payload.format?.duration);
  if (
    stream?.codec_name !== "h264" ||
    stream.width !== 720 ||
    stream.height !== 2016 ||
    stream.r_frame_rate !== "15/1" ||
    Math.abs(duration - 2) > 0.05
  ) {
    throw new Error(
      `Unexpected Living Strip media contract: ${JSON.stringify(payload)}`,
    );
  }
}

async function main() {
  const simulator = await chooseSimulator();
  if (!simulator) {
    throw new Error("No available iPhone simulator was found");
  }
  const wasBooted = simulator.state === "Booted";
  process.stdout.write(
    `Building BopFX fixture for ${simulator.name} (${simulator.udid})...\n`,
  );
  await mkdir(outputRoot, { recursive: true });
  await run("xcrun", [
    "swift-format",
    "lint",
    "--strict",
    "--recursive",
    path.join("ios", "CameraCore"),
    path.join("ios", "App", "App", "BopFXLivingCaptureBuffer.swift"),
  ]);
  await run("swift", [
    "test",
    "--package-path",
    path.join("ios", "CameraCore"),
  ]);
  await run("xcodebuild", [
    "-quiet",
    "-project",
    projectFile,
    "-scheme",
    "App",
    "-configuration",
    "Debug",
    "-destination",
    "generic/platform=iOS Simulator",
    "-derivedDataPath",
    derivedDataPath,
    "CODE_SIGNING_ALLOWED=NO",
    "build",
  ]);

  if (!wasBooted) {
    await run("xcrun", ["simctl", "boot", simulator.udid]);
    await run("xcrun", ["simctl", "bootstatus", simulator.udid, "-b"]);
  }

  try {
    await run("xcrun", ["simctl", "install", simulator.udid, appPath]);
    const { stdout: containerOutput } = await run("xcrun", [
      "simctl",
      "get_app_container",
      simulator.udid,
      bundleId,
      "data",
    ]);
    const container = containerOutput.trim();
    const labDirectory = path.join(container, "Documents", "BopFXLab");
    await rm(labDirectory, { recursive: true, force: true });
    await run("xcrun", [
      "simctl",
      "launch",
      "--terminate-running-process",
      simulator.udid,
      bundleId,
      "--bopfx-fixture",
    ]);

    const report = await waitForReport(labDirectory);
    await validateArtifacts(labDirectory, report);
    const evidenceDirectory = path.join(outputRoot, "evidence");
    await rm(evidenceDirectory, { recursive: true, force: true });
    await cp(labDirectory, evidenceDirectory, { recursive: true });
    process.stdout.write(
      `BopFX fixture passed. Evidence: ${evidenceDirectory}\n`,
    );
  } finally {
    await run("xcrun", ["simctl", "terminate", simulator.udid, bundleId], {
      allowFailure: true,
    });
    if (!wasBooted) {
      await run("xcrun", ["simctl", "shutdown", simulator.udid], {
        allowFailure: true,
      });
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
