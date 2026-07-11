import { beforeEach, describe, expect, it, vi } from "vitest";
import {
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

  it("uses a fresh cache offline and expires it back to binary defaults", async () => {
    const success = vi.fn(
      async () => new Response(JSON.stringify(validDocument), { status: 200 }),
    );
    await refreshRemoteConfig({ fetcher: success, now: 10_000 });

    const offline = vi.fn(async () => {
      throw new TypeError("offline");
    });
    expect(
      (await refreshRemoteConfig({ fetcher: offline, now: 20_000 })).features
        .editor,
    ).toBe(false);
    expect(
      loadCachedRemoteConfig({ now: 10_000 + 8 * 24 * 60 * 60 * 1000 }),
    ).toEqual(REMOTE_CONFIG_DEFAULTS);
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
