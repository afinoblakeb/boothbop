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
});
