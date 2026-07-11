import { describe, expect, it } from "vitest";
import {
  appStoreVersionCreateBody,
  assertProjectVersions,
  assertReleaseVersion,
  buildLinkBody,
  localizationUpdateBody,
  releaseTag,
  reviewSubmissionCreateBody,
  reviewSubmissionItemCreateBody,
  reviewSubmissionSubmitBody,
} from "./release-contract.mjs";

describe("App Store release contract", () => {
  it("accepts only explicit three-part version and build strings", () => {
    expect(assertReleaseVersion("0.0.4")).toBe("0.0.4");
    expect(releaseTag("0.0.4", "0.0.4")).toBe("appstore-v0.0.4-build-0.0.4");
    expect(() => assertReleaseVersion("latest")).toThrow(/three numeric/);
    expect(() => assertReleaseVersion("0.0.4-beta")).toThrow(/three numeric/);
  });

  it("requires the Xcode project to match both requested identifiers", () => {
    const project = `
      MARKETING_VERSION = 0.0.4;
      CURRENT_PROJECT_VERSION = 0.0.4;
      MARKETING_VERSION = 0.0.4;
      CURRENT_PROJECT_VERSION = 0.0.4;
    `;
    expect(() =>
      assertProjectVersions(project, "0.0.4", "0.0.4"),
    ).not.toThrow();
    expect(() => assertProjectVersions(project, "0.0.5", "0.0.4")).toThrow(
      /MARKETING_VERSION/,
    );
  });

  it("builds only the reviewed App Store API resource shapes", () => {
    expect(
      appStoreVersionCreateBody({ appId: "app", version: "0.0.4", year: 2026 }),
    ).toMatchObject({
      data: {
        type: "appStoreVersions",
        attributes: {
          platform: "IOS",
          versionString: "0.0.4",
          releaseType: "AFTER_APPROVAL",
          usesIdfa: false,
        },
        relationships: { app: { data: { type: "apps", id: "app" } } },
      },
    });
    expect(buildLinkBody("build")).toEqual({
      data: { type: "builds", id: "build" },
    });
    expect(reviewSubmissionCreateBody("app")).toMatchObject({
      data: { type: "reviewSubmissions" },
    });
    expect(
      reviewSubmissionItemCreateBody("submission", "version"),
    ).toMatchObject({
      data: {
        type: "reviewSubmissionItems",
        relationships: {
          reviewSubmission: { data: { id: "submission" } },
          appStoreVersion: { data: { id: "version" } },
        },
      },
    });
    expect(reviewSubmissionSubmitBody("submission")).toMatchObject({
      data: { id: "submission", attributes: { submitted: true } },
    });
  });

  it("trims and bounds the What's New field", () => {
    expect(
      localizationUpdateBody("localization", "  Better exports.  "),
    ).toMatchObject({ data: { attributes: { whatsNew: "Better exports." } } });
    expect(() => localizationUpdateBody("localization", " ")).toThrow(/empty/);
    expect(() =>
      localizationUpdateBody("localization", "x".repeat(4_001)),
    ).toThrow(/4,000/);
  });
});
