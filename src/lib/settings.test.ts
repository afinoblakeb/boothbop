import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTOSAVE_DEFAULTS,
  QUALITY_DEFAULTS,
  GIF_SIZE,
  anyAutosaveOn,
  loadAutosave,
  loadQuality,
  planAutosaveTasks,
  saveAutosaveDest,
  saveAutosaveFormat,
  loadBranding,
  saveBranding,
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

  it("honors remote format kill switches for background auto-save", () => {
    const tasks = planAutosaveTasks(all, {
      gifSupported: false,
      videoSupported: false,
    });
    expect(tasks.map((t) => t.format)).toEqual(["strip", "grid"]);
  });
});

describe("export quality persistence", () => {
  it("defaults every media type to high when storage is empty", () => {
    expect(loadQuality()).toEqual(QUALITY_DEFAULTS);
    expect(QUALITY_DEFAULTS).toEqual({
      photo: "high",
      gif: "high",
      video: "high",
    });
    expect(GIF_SIZE.high).toBeGreaterThanOrEqual(1080);
  });

  it("migrates every legacy tier to the best-quality profile", () => {
    localStorage.setItem("bb.quality.photo", "low");
    localStorage.setItem("bb.quality.gif", "standard");
    localStorage.setItem("bb.quality.video", "low");

    expect(loadQuality()).toEqual(QUALITY_DEFAULTS);
    expect(localStorage.getItem("bb.quality.photo")).toBe("high");
    expect(localStorage.getItem("bb.quality.gif")).toBe("high");
    expect(localStorage.getItem("bb.quality.video")).toBe("high");
  });

  it("treats an unknown stored tier as the high-quality default", () => {
    localStorage.setItem("bb.quality.video", "ultra");
    expect(loadQuality().video).toBe("high");
  });
});

describe("branding preference", () => {
  it("defaults branding on and persists either choice", () => {
    expect(loadBranding()).toBe(true);
    saveBranding(false);
    expect(loadBranding()).toBe(false);
    saveBranding(true);
    expect(loadBranding()).toBe(true);
  });
});
