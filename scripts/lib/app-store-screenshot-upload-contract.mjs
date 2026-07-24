export function createScreenshotSetBody(localizationId, displayType) {
  return {
    data: {
      type: "appScreenshotSets",
      attributes: { screenshotDisplayType: displayType },
      relationships: {
        appStoreVersionLocalization: {
          data: {
            type: "appStoreVersionLocalizations",
            id: localizationId,
          },
        },
      },
    },
  };
}

export function createScreenshotBody(setId, fileName, fileSize) {
  return {
    data: {
      type: "appScreenshots",
      attributes: { fileName, fileSize },
      relationships: {
        appScreenshotSet: {
          data: { type: "appScreenshotSets", id: setId },
        },
      },
    },
  };
}

export function commitScreenshotBody(screenshotId, checksum) {
  return {
    data: {
      type: "appScreenshots",
      id: screenshotId,
      attributes: {
        uploaded: true,
        sourceFileChecksum: checksum,
      },
    },
  };
}

export function cancelReviewSubmissionBody(submissionId) {
  return {
    data: {
      type: "reviewSubmissions",
      id: submissionId,
      attributes: { canceled: true },
    },
  };
}
