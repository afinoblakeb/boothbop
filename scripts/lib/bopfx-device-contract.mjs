const supportedCommands = new Set([
  "help",
  "status",
  "prepare",
  "launch",
  "logs",
  "collect",
]);

export function parseBopFXDeviceCommand(args, defaultDeviceName = "Blerque") {
  const command = args[0] ?? "help";
  if (!supportedCommands.has(command)) {
    throw new Error(`Unsupported BopFX device command: ${command}`);
  }

  let deviceName = defaultDeviceName;
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--device") {
      throw new Error(`Unsupported BopFX device option: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("--device requires a value");
    }
    deviceName = value;
    index += 1;
  }

  return { command, deviceName };
}

export function pickBopFXPhysicalDevice(devices, requestedName) {
  const matches = devices.filter((device) => {
    const hardware = device?.hardwareProperties ?? {};
    return (
      device?.deviceProperties?.name === requestedName &&
      device?.connectionProperties?.pairingState === "paired" &&
      hardware.platform === "iOS" &&
      hardware.reality === "physical" &&
      hardware.marketingName?.startsWith("iPhone")
    );
  });

  if (matches.length === 0) {
    throw new Error(
      `No paired physical iPhone named "${requestedName}" is available`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `CoreDevice returned more than one paired physical iPhone named "${requestedName}"`,
    );
  }
  return matches[0];
}

export function makeBopFXDeviceEvidenceName(deviceName, date = new Date()) {
  const timestamp = date.toISOString().replace(/[.:]/g, "-");
  const safeDeviceName = deviceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${timestamp}-${safeDeviceName || "iphone"}`;
}

export function makeBopFXDeviceCommands({
  appPath,
  bundleId,
  copyDestination,
  copyResultPath,
  copySource,
  derivedDataPath,
  deviceIdentifier,
  installResultPath,
  launchResultPath,
  projectFile,
  scheme,
  udid,
}) {
  return {
    build: [
      "-quiet",
      "-project",
      projectFile,
      "-scheme",
      scheme,
      "-configuration",
      "Debug",
      "-destination",
      `id=${udid}`,
      "-derivedDataPath",
      derivedDataPath,
      "-allowProvisioningUpdates",
      "build",
    ],
    copy: [
      "device",
      "copy",
      "from",
      "--device",
      deviceIdentifier,
      "--source",
      copySource,
      "--destination",
      copyDestination,
      "--domain-type",
      "appDataContainer",
      "--domain-identifier",
      bundleId,
      "--quiet",
      "--timeout",
      "120",
      "--json-output",
      copyResultPath,
    ],
    install: [
      "device",
      "install",
      "app",
      "--device",
      deviceIdentifier,
      "--quiet",
      "--timeout",
      "120",
      "--json-output",
      installResultPath,
      appPath,
    ],
    launch: [
      "device",
      "process",
      "launch",
      "--device",
      deviceIdentifier,
      "--terminate-existing",
      "--activate",
      "--quiet",
      "--timeout",
      "30",
      "--json-output",
      launchResultPath,
      bundleId,
    ],
  };
}
