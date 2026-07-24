#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  makeBopFXDeviceCommands,
  makeBopFXDeviceEvidenceName,
  parseBopFXDeviceCommand,
  pickBopFXPhysicalDevice,
} from "./lib/bopfx-device-contract.mjs";

const projectRoot = process.cwd();
const projectFile = path.join("ios", "App", "App.xcodeproj");
const bundleId = "com.boothbop.app";
const scheme = "App";
const outputRoot =
  process.env.BOPFX_DEVICE_OUTPUT ??
  path.join(projectRoot, "ios", "DerivedData", "bopfx-device");
const derivedDataPath = path.join(outputRoot, "DerivedData");
const appPath = path.join(
  derivedDataPath,
  "Build",
  "Products",
  "Debug-iphoneos",
  "App.app",
);
const runtimeDirectory = path.join(outputRoot, "runtime");
const activeSessionPath = path.join(outputRoot, "active-session.json");

function run(command, args, { allowFailure = false, inherit = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }
    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
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

async function readJSON(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJSON(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function listDevices() {
  await mkdir(runtimeDirectory, { recursive: true });
  const outputPath = path.join(
    runtimeDirectory,
    `devices-${process.pid}-${Date.now()}.json`,
  );
  await run("xcrun", [
    "devicectl",
    "list",
    "devices",
    "--quiet",
    "--timeout",
    "15",
    "--json-output",
    outputPath,
  ]);
  return (await readJSON(outputPath)).result?.devices ?? [];
}

async function selectDevice(deviceName) {
  return pickBopFXPhysicalDevice(await listDevices(), deviceName);
}

function deviceSummary(device) {
  return {
    connected:
      device.connectionProperties?.tunnelState === "connected" &&
      device.deviceProperties?.ddiServicesAvailable === true,
    developerMode: device.deviceProperties?.developerModeStatus === "enabled",
    marketingName: device.hardwareProperties?.marketingName,
    name: device.deviceProperties?.name,
    osVersion: device.deviceProperties?.osVersionNumber,
    pairingState: device.connectionProperties?.pairingState,
    transport: device.connectionProperties?.transportType,
    tunnelState: device.connectionProperties?.tunnelState,
  };
}

function assertDeviceReady(device) {
  const summary = deviceSummary(device);
  if (!summary.developerMode) {
    throw new Error(`${summary.name} does not have Developer Mode enabled`);
  }
  if (!summary.connected) {
    throw new Error(
      `${summary.name} is paired but unavailable for development. Unlock it and connect it by USB or trusted Wi-Fi, then run status again.`,
    );
  }
}

function commandsFor(
  device,
  {
    copyDestination = "",
    copyResultPath = "",
    copySource = "",
    installResultPath = "",
    launchResultPath = "",
  } = {},
) {
  return makeBopFXDeviceCommands({
    appPath,
    bundleId,
    copyDestination,
    copyResultPath,
    copySource,
    derivedDataPath,
    deviceIdentifier: device.identifier,
    installResultPath,
    launchResultPath,
    projectFile,
    scheme,
    udid: device.hardwareProperties.udid,
  });
}

async function gitValue(args) {
  const { stdout } = await run("git", args);
  return stdout.trim();
}

async function makeManifest(device, command) {
  const porcelain = await gitValue(["status", "--porcelain"]);
  return {
    app: "BoothBop",
    branch: await gitValue(["branch", "--show-current"]),
    bundleId,
    command,
    commit: await gitValue(["rev-parse", "HEAD"]),
    createdAt: new Date().toISOString(),
    device: deviceSummary(device),
    dirtyWorktree: porcelain.length > 0,
    privateEvidence: true,
  };
}

async function makeEvidenceDirectory(device, command) {
  const directory = path.join(
    outputRoot,
    "evidence",
    makeBopFXDeviceEvidenceName(device.deviceProperties.name),
  );
  await mkdir(directory, { recursive: true });
  await writeJSON(
    path.join(directory, "manifest.json"),
    await makeManifest(device, command),
  );
  await writeFile(
    path.join(directory, "PRIVATE-EVIDENCE.txt"),
    [
      "This directory may contain personal camera media and device logs.",
      "It lives under gitignored ios/DerivedData and must not be committed.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(directory, "protocol.md"),
    await readFile(
      path.join(
        projectRoot,
        "docs",
        "research",
        "BOPFX_DEVICE_EVALUATION_PROTOCOL.md",
      ),
      "utf8",
    ),
  );
  await writeJSON(activeSessionPath, {
    deviceName: device.deviceProperties.name,
    directory,
  });
  return directory;
}

async function currentEvidenceDirectory(device) {
  try {
    const activeSession = await readJSON(activeSessionPath);
    const directory = path.resolve(activeSession.directory);
    const evidenceRoot = `${path.resolve(outputRoot, "evidence")}${path.sep}`;
    if (
      activeSession.deviceName === device.deviceProperties.name &&
      directory.startsWith(evidenceRoot)
    ) {
      await readdir(directory);
      return directory;
    }
  } catch {
    // A missing or stale private session starts a new evidence directory.
  }
  return makeEvidenceDirectory(device, "collect");
}

async function status(deviceName) {
  const device = await selectDevice(deviceName);
  process.stdout.write(`${JSON.stringify(deviceSummary(device), null, 2)}\n`);
}

async function prepare(deviceName) {
  const device = await selectDevice(deviceName);
  assertDeviceReady(device);

  process.stdout.write("Syncing the current web bundle into iOS... ");
  await run("npm", ["run", "ios:sync"]);
  process.stdout.write("done\n");

  process.stdout.write(`Building signed Debug app for ${deviceName}... `);
  await run("xcodebuild", commandsFor(device).build);
  process.stdout.write("done\n");

  await mkdir(runtimeDirectory, { recursive: true });
  const installResult = path.join(
    runtimeDirectory,
    `install-${process.pid}-${Date.now()}.json`,
  );
  process.stdout.write(`Installing Debug app on ${deviceName}... `);
  await run("xcrun", [
    "devicectl",
    ...commandsFor(device, { installResultPath: installResult }).install,
  ]);
  process.stdout.write("done\n");

  const manifest = await makeManifest(device, "prepare");
  await writeJSON(path.join(outputRoot, "latest-install.json"), {
    ...manifest,
    appPath,
  });
  await writeJSON(activeSessionPath, {
    deviceName: device.deviceProperties.name,
    directory: null,
  });
  process.stdout.write(
    "Installed but not launched. Run the launch command when device testing begins.\n",
  );
}

async function launch(deviceName) {
  const device = await selectDevice(deviceName);
  assertDeviceReady(device);
  await mkdir(runtimeDirectory, { recursive: true });
  const launchResult = path.join(
    runtimeDirectory,
    `launch-${process.pid}-${Date.now()}.json`,
  );
  await run("xcrun", [
    "devicectl",
    ...commandsFor(device, { launchResultPath: launchResult }).launch,
  ]);
  process.stdout.write(`Launched BoothBop on ${deviceName}.\n`);
}

async function logs(deviceName) {
  const device = await selectDevice(deviceName);
  assertDeviceReady(device);
  const evidenceDirectory = await makeEvidenceDirectory(device, "logs");
  const logPath = path.join(evidenceDirectory, "device.log");
  const args = [
    "--udid",
    device.hardwareProperties.udid,
    "--process",
    "App|ReportCrash",
    "--no-colors",
    "--output",
    logPath,
  ];
  if (device.connectionProperties?.transportType === "localNetwork") {
    args.unshift("--network");
  }
  process.stdout.write(
    `Recording App and ReportCrash output to ${logPath}\nPress Ctrl-C after the manual test session.\n`,
  );
  await streamDeviceLogs(args);
  process.stdout.write(`Device log saved to ${logPath}\n`);
}

function streamDeviceLogs(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("idevicesyslog", args, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    });
    const stop = () => child.kill("SIGTERM");
    process.once("SIGINT", stop);
    child.on("error", (error) => {
      process.removeListener("SIGINT", stop);
      reject(error);
    });
    child.on("close", (code, signal) => {
      process.removeListener("SIGINT", stop);
      if (code === 0 || signal === "SIGINT" || signal === "SIGTERM") {
        resolve();
      } else {
        reject(new Error(`idevicesyslog exited with code ${code}`));
      }
    });
  });
}

async function copyFromApp(device, source, destination) {
  const resultPath = path.join(
    runtimeDirectory,
    `copy-${process.pid}-${Date.now()}-${path.basename(destination)}.json`,
  );
  return run(
    "xcrun",
    [
      "devicectl",
      ...commandsFor(device, {
        copyDestination: destination,
        copyResultPath: resultPath,
        copySource: source,
      }).copy,
    ],
    { allowFailure: true },
  );
}

async function findNamedFiles(directory, filename) {
  const matches = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return matches;
  }
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await findNamedFiles(entryPath, filename)));
    } else if (entry.name === filename) {
      matches.push(entryPath);
    }
  }
  return matches;
}

async function collect(deviceName) {
  const device = await selectDevice(deviceName);
  assertDeviceReady(device);
  await mkdir(runtimeDirectory, { recursive: true });
  const evidenceDirectory = await currentEvidenceDirectory(device);
  const collectionDirectory = path.join(
    evidenceDirectory,
    "collections",
    new Date().toISOString().replace(/[.:]/g, "-"),
  );
  await mkdir(collectionDirectory, { recursive: true });

  process.stdout.write("Collecting the app's private temporary media... ");
  const temporaryResult = await copyFromApp(
    device,
    "tmp",
    path.join(collectionDirectory, "app-tmp"),
  );
  process.stdout.write(temporaryResult.code === 0 ? "done\n" : "unavailable\n");

  process.stdout.write("Collecting deterministic fixture evidence... ");
  const fixtureResult = await copyFromApp(
    device,
    "Documents/BopFXLab",
    path.join(collectionDirectory, "fixture"),
  );
  process.stdout.write(fixtureResult.code === 0 ? "done\n" : "not present\n");

  const livingArtifacts = await findNamedFiles(
    collectionDirectory,
    "living-strip.mp4",
  );
  await writeJSON(path.join(collectionDirectory, "collection.json"), {
    fixtureCopied: fixtureResult.code === 0,
    livingArtifacts: livingArtifacts.map((filePath) =>
      path.relative(collectionDirectory, filePath),
    ),
    temporaryMediaCopied: temporaryResult.code === 0,
  });
  process.stdout.write(
    [
      `Private evidence session: ${evidenceDirectory}`,
      `Collection snapshot: ${collectionDirectory}`,
      `Living Strip artifacts found: ${livingArtifacts.length}`,
      "",
    ].join("\n"),
  );
}

function help() {
  process.stdout.write(
    [
      "BoothBop BopFX physical-device harness",
      "",
      "No command installs or launches by default.",
      "",
      "Commands:",
      "  help                       Show this message.",
      "  status                     Inspect the paired physical iPhone.",
      "  prepare                    Sync, build, and install Debug; do not launch.",
      "  launch                     Explicitly launch the installed app.",
      "  logs                       Stream App/ReportCrash logs until Ctrl-C.",
      "  collect                    Copy private app temp/fixture evidence locally.",
      "",
      "Options:",
      '  --device "Name"            Override the default device name Blerque.',
      "",
    ].join("\n"),
  );
}

async function main() {
  const { command, deviceName } = parseBopFXDeviceCommand(
    process.argv.slice(2),
    process.env.BOPFX_DEVICE_NAME ?? "Blerque",
  );
  switch (command) {
    case "help":
      help();
      break;
    case "status":
      await status(deviceName);
      break;
    case "prepare":
      await prepare(deviceName);
      break;
    case "launch":
      await launch(deviceName);
      break;
    case "logs":
      await logs(deviceName);
      break;
    case "collect":
      await collect(deviceName);
      break;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
