/**
 * Keyed, single-flight render work with owner-scoped cancellation.
 *
 * Callers that request the same key share the exact same promise, even when
 * they have different owners. Releasing one owner only aborts work when no
 * other owner still needs it. Calls without an owner use the default
 * interactive owner, preserving the single-slot API for ordinary UI renders.
 */
export class RenderJob<T> {
  private readonly defaultOwner = Symbol("render-job-default-owner");
  private readonly ownerKeys = new Map<symbol, string>();
  private readonly entries = new Map<
    string,
    {
      controller: AbortController;
      owners: Set<symbol>;
      promise: Promise<T>;
      value: T | undefined;
    }
  >();

  get(
    key: string,
    produce: (signal: AbortSignal) => Promise<T>,
    owner = this.defaultOwner,
  ): Promise<T> {
    if (this.ownerKeys.get(owner) === key) {
      const owned = this.entries.get(key);
      if (owned) return owned.promise;
    }

    this.release(owner);

    const shared = this.entries.get(key);
    if (shared) {
      shared.owners.add(owner);
      this.ownerKeys.set(owner, key);
      return shared.promise;
    }

    const controller = new AbortController();
    const promise = produce(controller.signal);
    const entry = {
      controller,
      owners: new Set([owner]),
      promise,
      value: undefined as T | undefined,
    };
    this.entries.set(key, entry);
    this.ownerKeys.set(owner, key);

    void promise.then(
      (value) => {
        if (this.entries.get(key) === entry) entry.value = value;
      },
      () => {
        if (this.entries.get(key) !== entry) return;
        this.entries.delete(key);
        for (const entryOwner of entry.owners) {
          if (this.ownerKeys.get(entryOwner) === key)
            this.ownerKeys.delete(entryOwner);
        }
      },
    );

    return promise;
  }

  peek(key: string, owner = this.defaultOwner): T | undefined {
    if (this.ownerKeys.get(owner) !== key) return undefined;
    return this.entries.get(key)?.value;
  }

  invalidate(owner = this.defaultOwner): void {
    this.release(owner);
  }

  invalidateAll(): void {
    for (const entry of this.entries.values()) entry.controller.abort();
    this.entries.clear();
    this.ownerKeys.clear();
  }

  private release(owner: symbol): void {
    const key = this.ownerKeys.get(owner);
    if (key === undefined) return;
    this.ownerKeys.delete(owner);

    const entry = this.entries.get(key);
    if (!entry) return;
    entry.owners.delete(owner);
    if (entry.owners.size > 0) return;

    this.entries.delete(key);
    entry.controller.abort();
  }
}
