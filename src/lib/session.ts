/** Frame order for a normal loop or a forward/backward Boom loop. */
export function frameIndexes(length: number, boom: boolean): number[] {
  const forward = Array.from({ length }, (_, index) => index);
  if (!boom || length < 2) return forward;
  return [...forward, ...forward.slice(1, -1).reverse()];
}

/** Replace one frame without mutating the source collection. */
export function replaceFrame<T>(
  frames: readonly T[],
  index: number,
  frame: T,
): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= frames.length) {
    throw new RangeError("Frame index is out of range");
  }
  return frames.map((current, currentIndex) =>
    currentIndex === index ? frame : current,
  );
}

/** Serializes session writes while keeping each operation's own result. */
export class SessionPersistenceQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
