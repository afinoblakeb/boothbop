import { describe, expect, it } from "vitest";
import {
  assessLivingMedia,
  buildBopFXAutomaticReport,
  renderBopFXAutomaticReportMarkdown,
  scanBopFXDeviceLog,
} from "./bopfx-device-report.mjs";

const validProbe = {
  format: {
    duration: "2.000000",
  },
  streams: [
    {
      codec_name: "h264",
      height: 2016,
      nb_read_frames: "60",
      r_frame_rate: "30/1",
      width: 720,
    },
  ],
};

describe("BopFX device log assessment", () => {
  it("ignores known system diagnostics without hiding app-owned crashes", () => {
    expect(
      scanBopFXDeviceLog(
        [
          "WebContent Unable to hide query parameters from script",
          "Networking process took 2.1 seconds to launch",
        ].join("\n"),
      ),
    ).toEqual([]);

    expect(
      scanBopFXDeviceLog(
        [
          "*** Terminating app due to uncaught exception 'NSGenericException'",
          "startRunning may not be called between calls to beginConfiguration and commitConfiguration",
          "libc++abi: terminating due to uncaught exception",
        ].join("\n"),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "uncaughtException" }),
        expect.objectContaining({ id: "sessionConfigurationRace" }),
      ]),
    );
  });
});

describe("Living Strip media assessment", () => {
  it("accepts the portable contract with real decoded motion", () => {
    expect(
      assessLivingMedia({
        probe: validProbe,
        uniqueFrameCount: 18,
      }),
    ).toEqual(
      expect.objectContaining({
        frameCount: 60,
        passed: true,
        uniqueFrameCount: 18,
      }),
    );
  });

  it("rejects a still-looking or malformed video", () => {
    expect(
      assessLivingMedia({
        probe: validProbe,
        uniqueFrameCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        passed: false,
        problems: expect.arrayContaining([expect.stringMatching(/motion/i)]),
      }),
    );

    expect(
      assessLivingMedia({
        probe: {
          ...validProbe,
          streams: [
            {
              ...validProbe.streams[0],
              codec_name: "hevc",
              height: 1920,
            },
          ],
        },
        uniqueFrameCount: 18,
      }),
    ).toEqual(
      expect.objectContaining({
        passed: false,
        problems: expect.arrayContaining([
          expect.stringMatching(/codec/i),
          expect.stringMatching(/dimensions/i),
        ]),
      }),
    );
  });
});

describe("BopFX automatic report", () => {
  it("distinguishes passed automation, incomplete evidence, and blockers", () => {
    const artifact = {
      file: "collections/one/living-strip.mp4",
      ...assessLivingMedia({
        probe: validProbe,
        uniqueFrameCount: 18,
      }),
    };

    expect(
      buildBopFXAutomaticReport({
        artifacts: [artifact],
        deviceLog: "BoothBop camera started",
      }).automaticStatus,
    ).toBe("passed");

    expect(
      buildBopFXAutomaticReport({
        artifacts: [],
        deviceLog: "",
      }).automaticStatus,
    ).toBe("incomplete");

    expect(
      buildBopFXAutomaticReport({
        artifacts: [artifact],
        deviceLog: "Fatal error: stale camera generation",
      }).automaticStatus,
    ).toBe("blocked");
  });

  it("renders a private, scannable automatic report", () => {
    const report = buildBopFXAutomaticReport({
      artifacts: [
        {
          file: "collections/one/living-strip.mp4",
          ...assessLivingMedia({
            probe: validProbe,
            uniqueFrameCount: 18,
          }),
        },
      ],
      deviceLog: "BoothBop camera started",
    });
    const markdown = renderBopFXAutomaticReportMarkdown(report);

    expect(markdown).toContain("# BopFX Automatic Device Evidence");
    expect(markdown).toContain("PASSED");
    expect(markdown).toContain("living-strip.mp4");
    expect(markdown).toContain("Manual Checks Remaining");
    expect(markdown).toContain("private");
  });
});
