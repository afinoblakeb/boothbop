/**
 * One keyed, single-flight render slot.
 *
 * Callers that request the same key share the exact same promise. Invalidating
 * the slot prevents late work from becoming the current cached value without
 * pretending JavaScript can stop native encoders that are already running.
 */
export class RenderJob<T> {
  private generation = 0;
  private key: string | null = null;
  private promise: Promise<T> | null = null;
  private value: T | undefined;
  private controller: AbortController | null = null;

  get(key: string, produce: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.key === key && this.promise) return this.promise;

    this.controller?.abort();
    const controller = new AbortController();
    const generation = this.generation;
    const promise = produce(controller.signal);
    this.key = key;
    this.promise = promise;
    this.value = undefined;
    this.controller = controller;

    void promise.then(
      (value) => {
        if (
          this.generation === generation &&
          this.key === key &&
          this.promise === promise
        ) {
          this.value = value;
        }
      },
      () => {
        if (
          this.generation === generation &&
          this.key === key &&
          this.promise === promise
        ) {
          this.key = null;
          this.promise = null;
          this.value = undefined;
          this.controller = null;
        }
      },
    );

    return promise;
  }

  peek(key: string): T | undefined {
    return this.key === key ? this.value : undefined;
  }

  invalidate(): void {
    this.controller?.abort();
    this.generation += 1;
    this.key = null;
    this.promise = null;
    this.value = undefined;
    this.controller = null;
  }
}
