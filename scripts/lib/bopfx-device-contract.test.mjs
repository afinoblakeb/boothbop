import { describe, expect, it } from "vitest";
import {
  makeBopFXDeviceEvidenceName,
  makeBopFXDeviceCommands,
  parseBopFXDeviceCommand,
  pickBopFXPhysicalDevice,
} from "./bopfx-device-contract.mjs";

const blerque = {
  connectionProperties: {
    pairingState: "paired",
    tunnelState: "connected",
  },
  deviceProperties: {
    name: "Blerque",
    osVersionNumber: "26.5.2",
  },
  hardwareProperties: {
    marketingName: "iPhone 15 Pro",
    platform: "iOS",
    reality: "physical",
    udid: "TEST-PHONE-UDID",
  },
  identifier: "TEST-COREDEVICE-ID",
};

describe("BopFX physical-device selection", () => {
  it("selects the exact paired physical iPhone by name", () => {
    expect(
      pickBopFXPhysicalDevice(
        [
          {
            ...blerque,
            deviceProperties: { name: "Simulator" },
            hardwareProperties: {
              ...blerque.hardwareProperties,
              reality: "simulated",
            },
          },
          blerque,
        ],
        "Blerque",
      ),
    ).toEqual(blerque);
  });

  it("rejects a simulator, non-iOS device, or ambiguous name", () => {
    expect(() =>
      pickBopFXPhysicalDevice(
        [
          {
            ...blerque,
            hardwareProperties: {
              ...blerque.hardwareProperties,
              reality: "simulated",
            },
          },
        ],
        "Blerque",
      ),
    ).toThrow(/paired physical iPhone/);

    expect(() =>
      pickBopFXPhysicalDevice(
        [
          blerque,
          {
            ...blerque,
            identifier: "OTHER",
          },
        ],
        "Blerque",
      ),
    ).toThrow(/more than one/);
  });
});

describe("BopFX device command contract", () => {
  it("defaults to a side-effect-free help command", () => {
    expect(parseBopFXDeviceCommand([])).toEqual({
      command: "help",
      deviceName: "Blerque",
    });
  });

  it("accepts only explicit supported commands and a device override", () => {
    expect(
      parseBopFXDeviceCommand(["prepare", "--device", "Test Phone"]),
    ).toEqual({
      command: "prepare",
      deviceName: "Test Phone",
    });
    expect(() => parseBopFXDeviceCommand(["deploy"])).toThrow(
      /Unsupported BopFX device command/,
    );
    expect(() => parseBopFXDeviceCommand(["collect", "--device"])).toThrow(
      /requires a value/,
    );
  });

  it("creates stable private evidence directory names", () => {
    expect(
      makeBopFXDeviceEvidenceName(
        "Blerque / Blake",
        new Date("2026-07-24T08:09:10.000Z"),
      ),
    ).toBe("2026-07-24T08-09-10-000Z-blerque-blake");
  });

  it("keeps build, install, launch, and private collection explicit", () => {
    const commands = makeBopFXDeviceCommands({
      appPath: "/private/App.app",
      bundleId: "com.boothbop.app",
      copyDestination: "/private/evidence/app-tmp",
      copyResultPath: "/private/copy.json",
      copySource: "tmp",
      derivedDataPath: "/private/DerivedData",
      deviceIdentifier: blerque.identifier,
      installResultPath: "/private/install.json",
      launchResultPath: "/private/launch.json",
      projectFile: "ios/App/App.xcodeproj",
      scheme: "App",
      udid: blerque.hardwareProperties.udid,
    });

    expect(commands.build).toContain("Debug");
    expect(commands.build).toContain(`id=${blerque.hardwareProperties.udid}`);
    expect(commands.build).toContain("-allowProvisioningUpdates");
    expect(commands.install).toContain("/private/App.app");
    expect(commands.install).not.toContain("launch");
    expect(commands.launch).toContain("--terminate-existing");
    expect(commands.launch.at(-1)).toBe("com.boothbop.app");
    expect(commands.copy).toEqual(
      expect.arrayContaining([
        "--domain-type",
        "appDataContainer",
        "--domain-identifier",
        "com.boothbop.app",
        "--source",
        "tmp",
      ]),
    );
  });
});
