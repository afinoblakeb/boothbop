import { describe, expect, it } from "vitest";
import { frameIndexes, replaceFrame, SessionPersistenceQueue } from "./session";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("frame sequencing", () => {
  it("loops through frames in their original order", () => {
    expect(frameIndexes(4, false)).toEqual([0, 1, 2, 3]);
  });

  it("plays Boom forward and backward without repeating endpoints", () => {
    expect(frameIndexes(4, true)).toEqual([0, 1, 2, 3, 2, 1]);
    expect(frameIndexes(1, true)).toEqual([0]);
  });
});

describe("replaceFrame", () => {
  it("immutably changes exactly one frame", () => {
    const frames = ["one", "two", "three", "four"];
    const result = replaceFrame(frames, 2, "new");
    expect(result).toEqual(["one", "two", "new", "four"]);
    expect(result).not.toBe(frames);
    expect(frames).toEqual(["one", "two", "three", "four"]);
  });

  it("rejects an invalid frame index", () => {
    expect(() => replaceFrame(["one"], 1, "new")).toThrow(RangeError);
  });
});

describe("SessionPersistenceQueue", () => {
  it("queues a retake while the initial session save is still pending", async () => {
    const queue = new SessionPersistenceQueue();
    const initialSave = deferred<string>();
    const events: string[] = [];

    const initial = queue.enqueue(async () => {
      events.push("initial:start");
      const sessionId = await initialSave.promise;
      events.push("initial:commit");
      return sessionId;
    });
    const retake = queue.enqueue(async () => {
      events.push("retake:commit");
    });

    await Promise.resolve();
    expect(events).toEqual(["initial:start"]);

    initialSave.resolve("session-1");
    await expect(initial).resolves.toBe("session-1");
    await retake;
    expect(events).toEqual([
      "initial:start",
      "initial:commit",
      "retake:commit",
    ]);
  });

  it("commits overlapping retakes in the order they were enqueued", async () => {
    const queue = new SessionPersistenceQueue();
    const firstWrite = deferred<void>();
    const events: string[] = [];

    const first = queue.enqueue(async () => {
      events.push("first:start");
      await firstWrite.promise;
      events.push("first:commit");
    });
    const second = queue.enqueue(async () => {
      events.push("second:commit");
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    firstWrite.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual(["first:start", "first:commit", "second:commit"]);
  });

  it("continues with later writes after a persistence failure", async () => {
    const queue = new SessionPersistenceQueue();
    const failure = new Error("write failed");

    const failed = queue.enqueue(async () => {
      throw failure;
    });
    const recovered = queue.enqueue(async () => "saved");

    await expect(failed).rejects.toBe(failure);
    await expect(recovered).resolves.toBe("saved");
  });
});
