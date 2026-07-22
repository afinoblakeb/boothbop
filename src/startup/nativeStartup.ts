interface ServiceWorkerRegistrationLike {
  unregister: () => Promise<boolean>;
}

interface ServiceWorkerContainerLike {
  getRegistrations: () => Promise<readonly ServiceWorkerRegistrationLike[]>;
}

interface CacheStorageLike {
  keys: () => Promise<string[]>;
  delete: (cacheName: string) => Promise<boolean>;
}

interface ServiceWorkerStartupOptions {
  nativeShell: boolean;
  registerWebServiceWorker: () => void;
  serviceWorker?: ServiceWorkerContainerLike;
  cacheStorage?: CacheStorageLike;
}

async function unregisterAll(
  serviceWorker: ServiceWorkerContainerLike | undefined,
): Promise<void> {
  if (!serviceWorker) return;

  const registrations = await serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations.map((registration) => registration.unregister()),
  );
}

async function deleteAll(cacheStorage: CacheStorageLike | undefined) {
  if (!cacheStorage) return;

  const cacheNames = await cacheStorage.keys();
  await Promise.allSettled(
    cacheNames.map((cacheName) => cacheStorage.delete(cacheName)),
  );
}

export async function prepareServiceWorkerState({
  nativeShell,
  registerWebServiceWorker,
  serviceWorker = typeof navigator === "undefined"
    ? undefined
    : navigator.serviceWorker,
  cacheStorage = typeof caches === "undefined" ? undefined : caches,
}: ServiceWorkerStartupOptions): Promise<void> {
  if (!nativeShell) {
    registerWebServiceWorker();
    return;
  }

  await Promise.allSettled([
    unregisterAll(serviceWorker),
    deleteAll(cacheStorage),
  ]);
}
