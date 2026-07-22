import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  REMOTE_CONFIG_CACHE_MS,
  REMOTE_CONFIG_DEFAULTS,
  applyRemoteConfig,
  loadCachedRemoteConfig,
  parseRemoteConfig,
  refreshRemoteConfig,
  type RemoteConfigDocument,
} from "./remoteConfig";

beforeEach(() => localStorage.clear());

const validDocument: RemoteConfigDocument = {
  schemaVersion: 1,
  revision: 4,
  features: {
    editor: false,
    gif: true,
    video: false,
    boom: true,
    retakeOne: false,
    brandingControl: true,
  },
};

describe("remote configuration schema", () => {
  it("uses all reviewed capabilities when no remote document exists", () => {
    expect(REMOTE_CONFIG_DEFAULTS.features).toEqual({
      editor: true,
      gif: true,
      video: true,
      boom: true,
      retakeOne: true,
      brandingControl: true,
    });
  });

  it("accepts only the versioned, data-only feature schema", () => {
    expect(parseRemoteConfig(validDocument)).toEqual(validDocument);
    expect(
      parseRemoteConfig({ ...validDocument, scriptUrl: "https://example.com" }),
    ).toBeNull();
    expect(
      parseRemoteConfig({
        ...validDocument,
        features: { ...validDocument.features, futureFeature: true },
      }),
    ).toBeNull();
    expect(
      parseRemoteConfig({ ...validDocument, schemaVersion: 2 }),
    ).toBeNull();
    expect(parseRemoteConfig({ ...validDocument, revision: -1 })).toBeNull();
  });

  it("never remotely enables a capability excluded from the binary", () => {
    const binaryCapabilities = {
      ...REMOTE_CONFIG_DEFAULTS,
      features: { ...REMOTE_CONFIG_DEFAULTS.features, video: false },
    };
    expect(
      applyRemoteConfig(validDocument, binaryCapabilities).features,
    ).toEqual({
      editor: false,
      gif: true,
      video: false,
      boom: true,
      retakeOne: false,
      brandingControl: true,
    });
  });
});

describe("remote configuration delivery", () => {
  it("caches a valid response without cookies or referrer data", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(validDocument), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const resolved = await refreshRemoteConfig({ fetcher, now: 10_000 });
    expect(resolved.features.video).toBe(false);
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/boothbop\.com\/config\/v1\.json\?/),
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      }),
    );
    expect(loadCachedRemoteConfig({ now: 10_001 }).features.video).toBe(false);
  });

  it("keeps an expired cached kill switch fail-closed while offline", async () => {
    const success = vi.fn(
      async () => new Response(JSON.stringify(validDocument), { status: 200 }),
    );
    await refreshRemoteConfig({ fetcher: success, now: 10_000 });

    const offline = vi.fn(async () => {
      throw new TypeError("offline");
    });
    expect(
      (
        await refreshRemoteConfig({
          fetcher: offline,
          now: 10_000 + REMOTE_CONFIG_CACHE_MS + 1,
        })
      ).features.editor,
    ).toBe(false);
    expect(
      loadCachedRemoteConfig({ now: 10_000 + REMOTE_CONFIG_CACHE_MS + 1 }),
    ).toEqual(applyRemoteConfig(validDocument));
  });

  it("applies a valid response even when persistence fails", async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException("Storage is unavailable", "QuotaExceededError");
      }),
    } as unknown as Storage;
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(validDocument), { status: 200 }),
    );

    await expect(
      refreshRemoteConfig({ fetcher, storage, now: 10_000 }),
    ).resolves.toEqual(applyRemoteConfig(validDocument));
  });

  it("does not replace an expired cached revision with an older response", async () => {
    const newerDocument: RemoteConfigDocument = {
      ...validDocument,
      revision: 5,
      features: { ...validDocument.features, gif: false },
    };
    localStorage.setItem(
      "bb.remoteConfig.v1",
      JSON.stringify({ document: newerDocument, fetchedAt: 10_000 }),
    );
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(validDocument), { status: 200 }),
    );

    await expect(
      refreshRemoteConfig({
        fetcher,
        now: 10_000 + REMOTE_CONFIG_CACHE_MS + 1,
      }),
    ).resolves.toEqual(applyRemoteConfig(newerDocument));
    expect(
      JSON.parse(localStorage.getItem("bb.remoteConfig.v1") ?? "{}").document
        .revision,
    ).toBe(5);
  });

  it("ignores malformed network documents without replacing a valid cache", async () => {
    localStorage.setItem(
      "bb.remoteConfig.v1",
      JSON.stringify({ document: validDocument, fetchedAt: 10_000 }),
    );
    const malformed = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ...validDocument, javascript: "alert(1)" }),
          {
            status: 200,
          },
        ),
    );
    const resolved = await refreshRemoteConfig({
      fetcher: malformed,
      now: 20_000,
    });
    expect(resolved.features.editor).toBe(false);
    expect(
      JSON.parse(localStorage.getItem("bb.remoteConfig.v1") ?? "{}").fetchedAt,
    ).toBe(10_000);
  });
});
