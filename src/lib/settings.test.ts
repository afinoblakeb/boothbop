import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTOSAVE_DEFAULTS,
  anyAutosaveOn,
  loadAutosave,
  planAutosaveTasks,
  saveAutosaveDest,
  saveAutosaveFormat,
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
