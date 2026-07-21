export const APP_STORE_APP_ID = "6784074505";
export const APP_BUNDLE_ID = "com.boothbop.app";
export const APP_PLATFORM = "IOS";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function assertReleaseVersion(value, label = "version") {
  if (!VERSION_PATTERN.test(value ?? "")) {
    throw new Error(
      `${label} must use three numeric components (for example 0.0.4).`,
    );
  }
  return value;
}

export function releaseTag(version, build) {
  return `appstore-v${assertReleaseVersion(version)}-build-${assertReleaseVersion(build, "build")}`;
}

export function appStoreVersionCreateBody({ appId, version, year }) {
  return {
    data: {
      type: "appStoreVersions",
      attributes: {
        platform: APP_PLATFORM,
        versionString: assertReleaseVersion(version),
        copyright: `\u00a9 ${year} BoothBop`,
        releaseType: "AFTER_APPROVAL",
        usesIdfa: false,
      },
      relationships: {
        app: { data: { type: "apps", id: appId } },
      },
    },
  };
}

export function buildLinkBody(buildId) {
  return { data: { type: "builds", id: buildId } };
}

export function reviewSubmissionCreateBody(appId) {
  return {
    data: {
      type: "reviewSubmissions",
      relationships: {
        app: { data: { type: "apps", id: appId } },
      },
    },
  };
}

export function reviewSubmissionItemCreateBody(submissionId, versionId) {
  return {
    data: {
      type: "reviewSubmissionItems",
      relationships: {
        reviewSubmission: {
          data: { type: "reviewSubmissions", id: submissionId },
        },
        appStoreVersion: {
          data: { type: "appStoreVersions", id: versionId },
        },
      },
    },
  };
}

export function reviewSubmissionSubmitBody(submissionId) {
  return {
    data: {
      type: "reviewSubmissions",
      id: submissionId,
      attributes: { submitted: true },
    },
  };
}

export function localizationUpdateBody(localizationId, whatsNew) {
  const value = whatsNew.trim();
  if (!value) throw new Error("What's New text cannot be empty.");
  if (value.length > 4_000)
    throw new Error("What's New text exceeds 4,000 characters.");
  return {
    data: {
      type: "appStoreVersionLocalizations",
      id: localizationId,
      attributes: { whatsNew: value },
    },
  };
}

export function readProjectVersionSettings(projectText) {
  const marketing = [
    ...projectText.matchAll(/MARKETING_VERSION = ([^;]+);/g),
  ].map((match) => match[1]);
  const builds = [
    ...projectText.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g),
  ].map((match) => match[1]);
  return {
    marketing: [...new Set(marketing)],
    builds: [...new Set(builds)],
  };
}

export function assertProjectVersions(projectText, version, build) {
  const actual = readProjectVersionSettings(projectText);
  if (actual.marketing.length !== 1 || actual.marketing[0] !== version) {
    throw new Error(
      `Xcode MARKETING_VERSION is ${actual.marketing.join(", ") || "missing"}; expected ${version}.`,
    );
  }
  if (actual.builds.length !== 1 || actual.builds[0] !== build) {
    throw new Error(
      `Xcode CURRENT_PROJECT_VERSION is ${actual.builds.join(", ") || "missing"}; expected ${build}.`,
    );
  }
}

export function assertPackageVersion(packageText, version) {
  let packageJson;
  try {
    packageJson = JSON.parse(packageText);
  } catch {
    throw new Error("package.json is not valid JSON.");
  }
  if (packageJson.version !== version) {
    throw new Error(
      `package.json version is ${packageJson.version ?? "missing"}; expected ${version}.`,
    );
  }
}
