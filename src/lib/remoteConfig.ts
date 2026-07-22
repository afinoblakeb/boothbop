/**
 * Data-only operational controls for capabilities already present in the
 * reviewed binary. This module intentionally accepts no copy, URLs, markup,
 * code, or unknown feature names.
 */

export const REMOTE_CONFIG_URL = "https://boothbop.com/config/v1.json";
export const REMOTE_CONFIG_CACHE_KEY = "bb.remoteConfig.v1";
export const REMOTE_CONFIG_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

export interface RuntimeFeatureFlags {
  editor: boolean;
  gif: boolean;
  video: boolean;
  boom: boolean;
  retakeOne: boolean;
  brandingControl: boolean;
}

export interface RemoteConfigDocument {
  schemaVersion: 1;
  revision: number;
  features: RuntimeFeatureFlags;
}

export type RuntimeConfig = RemoteConfigDocument;

export const REMOTE_CONFIG_DEFAULTS: RuntimeConfig = {
  schemaVersion: 1,
  revision: 0,
  features: {
    editor: true,
    gif: true,
    video: true,
    boom: true,
    retakeOne: true,
    brandingControl: true,
  },
};

interface CachedRemoteConfig {
  document: RemoteConfigDocument;
  fetchedAt: number;
}

interface RefreshOptions {
  fetcher?: typeof fetch;
  storage?: Storage;
  now?: number;
  timeoutMs?: number;
  binaryCapabilities?: RuntimeConfig;
}

const TOP_LEVEL_KEYS = ["schemaVersion", "revision", "features"] as const;
const FEATURE_KEYS = [
  "editor",
  "gif",
  "video",
  "boom",
  "retakeOne",
  "brandingControl",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

export function parseRemoteConfig(value: unknown): RemoteConfigDocument | null {
  if (!isRecord(value) || !hasExactKeys(value, TOP_LEVEL_KEYS)) return null;
  if (value.schemaVersion !== 1) return null;
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) < 0)
    return null;
  if (!isRecord(value.features) || !hasExactKeys(value.features, FEATURE_KEYS))
    return null;
  const features = value.features;
  if (FEATURE_KEYS.some((key) => typeof features[key] !== "boolean"))
    return null;

  return {
    schemaVersion: 1,
    revision: Number(value.revision),
    features: Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, features[key]]),
    ) as unknown as RuntimeFeatureFlags,
  };
}

/** Remote values may turn reviewed capabilities off, never add a capability. */
export function applyRemoteConfig(
  document: RemoteConfigDocument,
  binaryCapabilities: RuntimeConfig = REMOTE_CONFIG_DEFAULTS,
): RuntimeConfig {
  return {
    schemaVersion: 1,
    revision: document.revision,
    features: Object.fromEntries(
      FEATURE_KEYS.map((key) => [
        key,
        binaryCapabilities.features[key] && document.features[key],
      ]),
    ) as unknown as RuntimeFeatureFlags,
  };
}

export function loadCachedRemoteConfig({
  storage = localStorage,
  now = Date.now(),
  binaryCapabilities = REMOTE_CONFIG_DEFAULTS,
}: Pick<
  RefreshOptions,
  "storage" | "now" | "binaryCapabilities"
> = {}): RuntimeConfig {
  try {
    const raw = storage.getItem(REMOTE_CONFIG_CACHE_KEY);
    if (!raw) return binaryCapabilities;
    const cached = JSON.parse(raw) as Partial<CachedRemoteConfig>;
    const document = parseRemoteConfig(cached.document);
    if (
      !document ||
      typeof cached.fetchedAt !== "number" ||
      cached.fetchedAt > now + 60_000
    ) {
      return binaryCapabilities;
    }
    return applyRemoteConfig(document, binaryCapabilities);
  } catch {
    return binaryCapabilities;
  }
}

export async function refreshRemoteConfig({
  fetcher = fetch,
  storage = localStorage,
  now = Date.now(),
  timeoutMs = 2_000,
  binaryCapabilities = REMOTE_CONFIG_DEFAULTS,
}: RefreshOptions = {}): Promise<RuntimeConfig> {
  const cached = loadCachedRemoteConfig({ storage, now, binaryCapabilities });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`${REMOTE_CONFIG_URL}?t=${now}`, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) return cached;
    const document = parseRemoteConfig(await response.json());
    if (!document || cached.revision > document.revision) return cached;
    const resolved = applyRemoteConfig(document, binaryCapabilities);
    try {
      storage.setItem(
        REMOTE_CONFIG_CACHE_KEY,
        JSON.stringify({
          document,
          fetchedAt: now,
        } satisfies CachedRemoteConfig),
      );
    } catch {
      // The fetched controls still apply for this session when storage fails.
    }
    return resolved;
  } catch {
    return cached;
  } finally {
    clearTimeout(timeout);
  }
}
