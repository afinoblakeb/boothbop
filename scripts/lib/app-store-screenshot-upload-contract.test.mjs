import { describe, expect, it } from "vitest";
import {
  cancelReviewSubmissionBody,
  createScreenshotBody,
  createScreenshotSetBody,
  commitScreenshotBody,
} from "./app-store-screenshot-upload-contract.mjs";

describe("App Store screenshot upload contract", () => {
  it("creates a screenshot set under the selected localization", () => {
    expect(createScreenshotSetBody("localization-id", "APP_IPHONE_67")).toEqual(
      {
        data: {
          type: "appScreenshotSets",
          attributes: { screenshotDisplayType: "APP_IPHONE_67" },
          relationships: {
            appStoreVersionLocalization: {
              data: {
                type: "appStoreVersionLocalizations",
                id: "localization-id",
              },
            },
          },
        },
      },
    );
  });

  it("reserves and commits an uploaded screenshot", () => {
    expect(createScreenshotBody("set-id", "1-camera.png", 1234)).toEqual({
      data: {
        type: "appScreenshots",
        attributes: { fileName: "1-camera.png", fileSize: 1234 },
        relationships: {
          appScreenshotSet: {
            data: { type: "appScreenshotSets", id: "set-id" },
          },
        },
      },
    });
    expect(commitScreenshotBody("screenshot-id", "abc123")).toEqual({
      data: {
        type: "appScreenshots",
        id: "screenshot-id",
        attributes: {
          uploaded: true,
          sourceFileChecksum: "abc123",
        },
      },
    });
  });

  it("cancels only the selected review submission", () => {
    expect(cancelReviewSubmissionBody("submission-id")).toEqual({
      data: {
        type: "reviewSubmissions",
        id: "submission-id",
        attributes: { canceled: true },
      },
    });
  });
});
