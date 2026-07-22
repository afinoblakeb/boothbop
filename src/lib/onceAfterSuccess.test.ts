import { describe, expect, it, vi } from "vitest";
import { onceAfterSuccess } from "./onceAfterSuccess";

describe("onceAfterSuccess", () => {
  it("shares concurrent work and retries after a failed attempt", async () => {
    let rejectFirst: ((reason: Error) => void) | undefined;
    const task = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValue(undefined);
    const run = onceAfterSuccess(task);

    const first = run();
    const concurrent = run();
    expect(task).toHaveBeenCalledTimes(1);
    rejectFirst?.(new Error("bridge not ready"));
    await expect(first).rejects.toThrow("bridge not ready");
    await expect(concurrent).rejects.toThrow("bridge not ready");

    await run();
    await run();
    expect(task).toHaveBeenCalledTimes(2);
  });
});
