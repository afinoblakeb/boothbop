import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTOSAVE_DEFAULTS,
  CAPTURE_DELAYS,
  EXPORT_SPEED_PROFILE,
  EXPORT_SPEEDS,
  QUALITY_DEFAULTS,
  anyAutosaveOn,
  loadAutosave,
  loadCaptureDelay,
  loadCaptureSound,
  loadExportSpeed,
  loadStripLayout,
  loadThemeKey,
  loadQuality,
  normalizeCaptureDelay,
  normalizeExportSpeed,
  planAutosaveTasks,
  saveAutosaveDest,
  saveAutosaveFormat,
  saveCaptureDelay,
  saveCaptureSound,
  saveExportSpeed,
  saveStripLayout,
  saveThemeKey,
  saveQuality,
  type AutosaveSettings,
} from "./settings";

beforeEach(() => localStorage.clear());

describe("autosave settings persistence", () => {
  it("defaults to album + all formats off when storage is empty", () => {
    expect(loadAutosave()).toEqual(AUTOSAVE_DEFAULTS);
  });

  it("round-trips destination and format toggles", () => {
    saveAutosaveDest("cameraRoll");
    saveAutosaveFormat("strip", true);
    saveAutosaveFormat("gif", true);
    const s = loadAutosave();
    expect(s.dest).toBe("cameraRoll");
    expect(s.strip).toBe(true);
    expect(s.gif).toBe(true);
    expect(s.grid).toBe(false);
    expect(s.video).toBe(false);
  });

  it("treats an unknown stored destination as album", () => {
    localStorage.setItem("bb.autosave.dest", "garbage");
    expect(loadAutosave().dest).toBe("album");
  });

  it("anyAutosaveOn reflects whether at least one format is on", () => {
    expect(anyAutosaveOn(AUTOSAVE_DEFAULTS)).toBe(false);
    expect(anyAutosaveOn({ ...AUTOSAVE_DEFAULTS, video: true })).toBe(true);
  });
});

describe("planAutosaveTasks", () => {
  const all: AutosaveSettings = {
    dest: "album",
    strip: true,
    grid: true,
    gif: true,
    video: true,
  };

  it("returns nothing when all toggles are off", () => {
    expect(
      planAutosaveTasks(AUTOSAVE_DEFAULTS, { videoSupported: true }),
    ).toEqual([]);
  });

  it("orders tasks strip → grid → gif → video with the right layouts", () => {
    const tasks = planAutosaveTasks(all, { videoSupported: true });
    expect(tasks.map((t) => t.format)).toEqual([
      "strip",
      "grid",
      "gif",
      "video",
    ]);
    expect(tasks[0].layout).toBe("4x1");
    expect(tasks[1].layout).toBe("2x2");
    expect(tasks[3].kind).toBe("video");
  });

  it("omits video when it isn't supported", () => {
    const tasks = planAutosaveTasks(all, { videoSupported: false });
    expect(tasks.map((t) => t.format)).toEqual(["strip", "grid", "gif"]);
  });
});

describe("export quality persistence", () => {
  it("defaults every media type to standard when storage is empty", () => {
    expect(loadQuality()).toEqual(QUALITY_DEFAULTS);
  });

  it("round-trips a per-media quality tier", () => {
    saveQuality("photo", "high");
    saveQuality("gif", "low");
    const q = loadQuality();
    expect(q.photo).toBe("high");
    expect(q.gif).toBe("low");
    expect(q.video).toBe("standard");
  });

  it("treats an unknown stored tier as standard", () => {
    localStorage.setItem("bb.quality.video", "ultra");
    expect(loadQuality().video).toBe("standard");
  });
});

describe("capture controls persistence", () => {
  it("documents the supported countdown delays", () => {
    expect(CAPTURE_DELAYS).toEqual([1, 2, 3, 5, 10]);
  });

  it("normalizes unsupported countdown values back to 2 seconds", () => {
    expect(normalizeCaptureDelay(5)).toBe(5);
    expect(normalizeCaptureDelay(9)).toBe(2);
  });

  it("round-trips the countdown delay", () => {
    saveCaptureDelay(10);
    expect(loadCaptureDelay()).toBe(10);
  });

  it("defaults capture sound on and persists the toggle", () => {
    expect(loadCaptureSound()).toBe(true);
    saveCaptureSound(false);
    expect(loadCaptureSound()).toBe(false);
    saveCaptureSound(true);
    expect(loadCaptureSound()).toBe(true);
  });
});

describe("motion export speed persistence", () => {
  it("documents the supported speed presets", () => {
    expect(EXPORT_SPEEDS).toEqual(["slow", "normal", "fast"]);
  });

  it("normalizes unsupported speed values back to normal", () => {
    expect(normalizeExportSpeed("fast")).toBe("fast");
    expect(normalizeExportSpeed("turbo")).toBe("normal");
    expect(normalizeExportSpeed(null)).toBe("normal");
  });

  it("round-trips the export speed", () => {
    saveExportSpeed("slow");
    expect(loadExportSpeed()).toBe("slow");
  });

  it("keeps fast exports shorter than slow exports", () => {
    expect(EXPORT_SPEED_PROFILE.fast.gifDelay).toBeLessThan(
      EXPORT_SPEED_PROFILE.slow.gifDelay,
    );
    expect(EXPORT_SPEED_PROFILE.fast.videoFrameMs).toBeLessThan(
      EXPORT_SPEED_PROFILE.slow.videoFrameMs,
    );
  });
});

describe("strip style persistence", () => {
  it("defaults to the classic strip style", () => {
    expect(loadStripLayout()).toBe("4x1");
    expect(loadThemeKey()).toBe("classic");
  });

  it("round-trips strip layout and theme", () => {
    saveStripLayout("story");
    saveThemeKey("teal");
    expect(loadStripLayout()).toBe("story");
    expect(loadThemeKey()).toBe("teal");
  });

  it("normalizes unsupported strip style values", () => {
    localStorage.setItem("bb.strip.layout", "poster");
    localStorage.setItem("bb.strip.theme", "neon");
    expect(loadStripLayout()).toBe("4x1");
    expect(loadThemeKey()).toBe("classic");
  });
});
