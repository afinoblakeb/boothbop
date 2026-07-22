import { describe, expect, it, vi } from "vitest";
import { RenderJob } from "./renderJob";

describe("RenderJob", () => {
  it("deduplicates concurrent work for the same key", async () => {
    const job = new RenderJob<number>();
    let resolve!: (value: number) => void;
    const producer = vi.fn(
      () =>
        new Promise<number>((done) => {
          resolve = done;
        }),
    );

    const first = job.get("session-a", producer);
    const second = job.get("session-a", producer);

    expect(second).toBe(first);
    expect(producer).toHaveBeenCalledTimes(1);
    resolve(42);
    await expect(first).resolves.toBe(42);
    expect(job.peek("session-a")).toBe(42);
  });

  it("starts fresh work after invalidation and ignores the stale result", async () => {
    const job = new RenderJob<number>();
    let resolveOld!: (value: number) => void;
    const old = job.get(
      "old",
      () => new Promise<number>((done) => (resolveOld = done)),
    );

    job.invalidate();
    const current = job.get("current", async () => 9);
    resolveOld(3);

    await expect(old).resolves.toBe(3);
    await expect(current).resolves.toBe(9);
    expect(job.peek("old")).toBeUndefined();
    expect(job.peek("current")).toBe(9);
  });

  it("removes failed work so a retry can succeed", async () => {
    const job = new RenderJob<number>();
    await expect(
      job.get("same", async () => {
        throw new Error("failed");
      }),
    ).rejects.toThrow("failed");

    await expect(job.get("same", async () => 7)).resolves.toBe(7);
  });

  it("aborts obsolete work when the key changes or the slot is invalidated", async () => {
    const job = new RenderJob<number>();
    const signals: AbortSignal[] = [];
    void job.get("first", async (signal) => {
      signals.push(signal);
      return new Promise<number>(() => {});
    });
    void job.get("second", async (signal) => {
      signals.push(signal);
      return new Promise<number>(() => {});
    });
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    job.invalidate();
    expect(signals[1].aborted).toBe(true);
  });

  it("keeps shared autosave work alive across interactive edits", async () => {
    const job = new RenderJob<number>();
    const autosaveOwner = Symbol("photos-autosave");
    const signals: AbortSignal[] = [];
    let resolveAutosave!: (value: number) => void;
    const producer = vi.fn(
      (signal: AbortSignal) =>
        new Promise<number>((resolve) => {
          signals.push(signal);
          resolveAutosave = resolve;
        }),
    );

    const interactive = job.get("captured", producer);
    const autosave = job.get("captured", producer, autosaveOwner);

    expect(autosave).toBe(interactive);
    expect(producer).toHaveBeenCalledOnce();

    job.invalidate();
    expect(signals[0].aborted).toBe(false);

    const edited = job.get("edited", async (signal) => {
      signals.push(signal);
      return 2;
    });
    expect(signals[0].aborted).toBe(false);
    expect(signals[1].aborted).toBe(false);

    resolveAutosave(1);
    await expect(autosave).resolves.toBe(1);
    await expect(edited).resolves.toBe(2);

    job.invalidate(autosaveOwner);
    expect(signals[0].aborted).toBe(true);
    expect(job.peek("edited")).toBe(2);
  });

  it("does not let delayed autosave displace a newer interactive render", () => {
    const job = new RenderJob<number>();
    const autosaveOwner = Symbol("photos-autosave");
    const signals: AbortSignal[] = [];

    void job.get("edited", async (signal) => {
      signals.push(signal);
      return new Promise<number>(() => {});
    });
    void job.get(
      "captured",
      async (signal) => {
        signals.push(signal);
        return new Promise<number>(() => {});
      },
      autosaveOwner,
    );

    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => !signal.aborted)).toBe(true);
  });

  it("keeps autosaves for consecutive shoots independently owned", () => {
    const job = new RenderJob<number>();
    const firstAutosave = Symbol("first-photos-autosave");
    const secondAutosave = Symbol("second-photos-autosave");
    const signals: AbortSignal[] = [];
    const pending = (signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<number>(() => {});
    };

    void job.get("shoot-1", pending, firstAutosave);
    void job.get("shoot-2", pending, secondAutosave);

    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => !signal.aborted)).toBe(true);

    job.invalidate(secondAutosave);
    expect(signals[0].aborted).toBe(false);
    expect(signals[1].aborted).toBe(true);
  });
});
