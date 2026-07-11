#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAppStoreClient,
  loadAppStoreCredentials,
} from "./lib/asc-client.mjs";
import {
  APP_BUNDLE_ID,
  APP_STORE_APP_ID,
  appStoreVersionCreateBody,
  assertProjectVersions,
  assertReleaseVersion,
  buildLinkBody,
  localizationUpdateBody,
  releaseTag,
  reviewSubmissionCreateBody,
  reviewSubmissionItemCreateBody,
  reviewSubmissionSubmitBody,
} from "./lib/release-contract.mjs";

const ROOT = process.cwd();
const PROJECT_PATH = path.join(ROOT, "ios", "App", "App.xcodeproj");
const PROJECT_FILE = path.join(PROJECT_PATH, "project.pbxproj");
const ACTIVE_REVIEW_STATES = new Set([
  "READY_FOR_REVIEW",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "CANCELING",
  "COMPLETING",
]);

function usage() {
  return `BoothBop App Store automation

Read-only:
  npm run appstore:status [-- --version 0.0.3]

Archive and validate locally:
  npm run appstore -- build --version 0.0.4 --build 0.0.4

Archive, validate, and upload a tagged clean commit:
  npm run appstore -- build --version 0.0.4 --build 0.0.4 --upload

Attach a processed build, update What's New, and submit for automatic release:
  npm run appstore -- submit --version 0.0.4 --build 0.0.4 \\
    --whats-new docs/releases/0.0.4.txt --confirm-submit

Run both upload and submission:
  npm run appstore -- release --version 0.0.4 --build 0.0.4 \\
    --whats-new docs/releases/0.0.4.txt --upload --confirm-submit

Destructive/network mutations require the explicit flags shown above.`;
}

function parseArguments(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--"))
      throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}

function requiredOption(options, key) {
  const value = options[key];
  if (typeof value !== "string") throw new Error(`Missing --${key}.`);
  return value;
}

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(
        new Error(
          [
            `Command failed (${code}): ${command} ${args.join(" ")}`,
            stdout,
            stderr,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );
    });
  });
}

async function assertCleanRepository() {
  const { stdout } = await run(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    {
      capture: true,
    },
  );
  if (stdout.trim()) {
    throw new Error("Release commands require a clean git worktree.");
  }
}

async function assertTaggedRelease(version, build) {
  const expected = releaseTag(version, build);
  const { stdout } = await run("git", ["tag", "--points-at", "HEAD"], {
    capture: true,
  });
  if (!stdout.split(/\r?\n/).includes(expected)) {
    throw new Error(
      `HEAD must be tagged ${expected} before upload or submission.`,
    );
  }
}

async function assertXcodeVersions(version, build) {
  assertProjectVersions(await readFile(PROJECT_FILE, "utf8"), version, build);
}

function queryPath(resourcePath, query) {
  const params = new URLSearchParams(query);
  return `${resourcePath}?${params}`;
}

async function getVersions(client) {
  const payload = await client.request(
    queryPath(`/v1/apps/${APP_STORE_APP_ID}/appStoreVersions`, {
      "filter[platform]": "IOS",
      limit: "50",
    }),
  );
  return payload.data;
}

async function findVersion(client, version) {
  return (await getVersions(client)).find(
    (item) => item.attributes.versionString === version,
  );
}

async function findBuild(client, version, build) {
  const payload = await client.request(
    queryPath("/v1/builds", {
      "filter[app]": APP_STORE_APP_ID,
      "filter[version]": build,
      include: "preReleaseVersion",
      limit: "20",
    }),
  );
  const prereleaseVersions = new Map(
    (payload.included ?? [])
      .filter((item) => item.type === "preReleaseVersions")
      .map((item) => [item.id, item.attributes.version]),
  );
  return payload.data.find((item) => {
    const prereleaseId = item.relationships?.preReleaseVersion?.data?.id;
    return prereleaseVersions.get(prereleaseId) === version;
  });
}

async function waitForBuild(
  client,
  version,
  build,
  timeoutMs = 30 * 60 * 1000,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const candidate = await findBuild(client, version, build);
    if (candidate?.attributes.processingState === "VALID") return candidate;
    if (candidate?.attributes.processingState === "FAILED") {
      throw new Error(
        `App Store Connect processing failed for ${version} (${build}).`,
      );
    }
    const state = candidate?.attributes.processingState ?? "not visible yet";
    process.stdout.write(
      `Build processing: ${state}. Checking again in 30 seconds...\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
  throw new Error(
    `Timed out waiting for App Store build ${version} (${build}).`,
  );
}

async function publicVersion() {
  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${APP_STORE_APP_ID}&country=us`,
  );
  if (!response.ok) return null;
  const payload = await response.json();
  return payload.results?.[0]?.version ?? null;
}

async function status(options) {
  const client = await createAppStoreClient();
  const versions = await getVersions(client);
  const requested =
    typeof options.version === "string" ? options.version : null;
  const selected = requested
    ? versions.filter((item) => item.attributes.versionString === requested)
    : versions;
  const submissions = await client.request(
    queryPath(`/v1/apps/${APP_STORE_APP_ID}/reviewSubmissions`, {
      include: "appStoreVersionForReview",
      limit: "20",
    }),
  );
  const result = {
    appId: APP_STORE_APP_ID,
    bundleId: APP_BUNDLE_ID,
    publicVersion: await publicVersion(),
    versions: selected.map((item) => ({
      id: item.id,
      version: item.attributes.versionString,
      state: item.attributes.appStoreState ?? item.attributes.appVersionState,
      releaseType: item.attributes.releaseType,
    })),
    reviewSubmissions: submissions.data.map((item) => ({
      id: item.id,
      state: item.attributes.state,
      submittedDate: item.attributes.submittedDate ?? null,
    })),
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function findIpa(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findIpa(candidate);
      if (nested) return nested;
    } else if (entry.name.endsWith(".ipa")) {
      return candidate;
    }
  }
  return null;
}

async function buildAndMaybeUpload(options) {
  const version = assertReleaseVersion(requiredOption(options, "version"));
  const build = assertReleaseVersion(requiredOption(options, "build"), "build");
  await assertCleanRepository();
  await assertXcodeVersions(version, build);
  if (options.upload) await assertTaggedRelease(version, build);

  await run("npm", ["run", "check"]);
  await run("npm", ["run", "test:e2e"]);
  await run("npm", ["run", "ios:sync"]);

  const credentials = await loadAppStoreCredentials();
  const outputRoot = path.join(
    ROOT,
    "build",
    "appstore",
    `${version}-${build}`,
  );
  const archivePath = path.join(outputRoot, `BoothBop-${version}.xcarchive`);
  const exportPath = path.join(outputRoot, "export");
  const exportOptions = path.join(outputRoot, "ExportOptions.plist");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    exportOptions,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>destination</key><string>export</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>stripSwiftSymbols</key><true/>
  <key>uploadSymbols</key><true/>
</dict></plist>
`,
  );

  const authentication = [
    "-allowProvisioningUpdates",
    "-authenticationKeyPath",
    credentials.keyPath,
    "-authenticationKeyID",
    credentials.keyId,
    "-authenticationKeyIssuerID",
    credentials.issuerId,
  ];
  await run("xcodebuild", [
    "-project",
    PROJECT_PATH,
    "-scheme",
    "App",
    "-configuration",
    "Release",
    "-destination",
    "generic/platform=iOS",
    "-archivePath",
    archivePath,
    ...authentication,
    "clean",
    "archive",
  ]);
  await run("xcodebuild", [
    "-exportArchive",
    "-archivePath",
    archivePath,
    "-exportPath",
    exportPath,
    "-exportOptionsPlist",
    exportOptions,
    ...authentication,
  ]);

  const ipaPath = await findIpa(exportPath);
  if (!ipaPath) throw new Error(`No IPA found under ${exportPath}.`);
  const altoolAuth = [
    "--apiKey",
    credentials.keyId,
    "--apiIssuer",
    credentials.issuerId,
  ];
  await run("xcrun", [
    "altool",
    "--validate-app",
    "--file",
    ipaPath,
    "--type",
    "ios",
    ...altoolAuth,
  ]);
  if (options.upload) {
    await run("xcrun", [
      "altool",
      "--upload-app",
      "--file",
      ipaPath,
      "--type",
      "ios",
      ...altoolAuth,
    ]);
    process.stdout.write(
      `Uploaded ${version} (${build}) to App Store Connect.\n`,
    );
  } else {
    process.stdout.write(`Validated locally: ${ipaPath}\n`);
    process.stdout.write(
      "Nothing was uploaded. Add --upload only after final review.\n",
    );
  }
}

async function ensureVersion(client, version) {
  const existing = await findVersion(client, version);
  if (existing) return existing;
  const created = await client.request("/v1/appStoreVersions", {
    method: "POST",
    body: appStoreVersionCreateBody({
      appId: APP_STORE_APP_ID,
      version,
      year: new Date().getFullYear(),
    }),
  });
  return created.data;
}

async function updateWhatsNew(client, versionId, whatsNew) {
  const localizations = await client.request(
    queryPath(
      `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
      {
        "filter[locale]": "en-US",
        limit: "1",
      },
    ),
  );
  const localization = localizations.data[0];
  if (localization) {
    await client.request(
      `/v1/appStoreVersionLocalizations/${localization.id}`,
      {
        method: "PATCH",
        body: localizationUpdateBody(localization.id, whatsNew),
      },
    );
    return localization.id;
  }

  const value = localizationUpdateBody("new", whatsNew).data.attributes
    .whatsNew;
  const created = await client.request("/v1/appStoreVersionLocalizations", {
    method: "POST",
    body: {
      data: {
        type: "appStoreVersionLocalizations",
        attributes: { locale: "en-US", whatsNew: value },
        relationships: {
          appStoreVersion: {
            data: { type: "appStoreVersions", id: versionId },
          },
        },
      },
    },
  });
  return created.data.id;
}

async function submit(options) {
  if (!options["confirm-submit"]) {
    throw new Error("Submission requires --confirm-submit.");
  }
  const version = assertReleaseVersion(requiredOption(options, "version"));
  const build = assertReleaseVersion(requiredOption(options, "build"), "build");
  const whatsNewPath = requiredOption(options, "whats-new");
  await assertCleanRepository();
  await assertXcodeVersions(version, build);
  await assertTaggedRelease(version, build);

  const client = await createAppStoreClient();
  const active = await client.request(
    queryPath(`/v1/apps/${APP_STORE_APP_ID}/reviewSubmissions`, {
      limit: "20",
    }),
  );
  const blocking = active.data.find((item) =>
    ACTIVE_REVIEW_STATES.has(item.attributes.state),
  );
  if (blocking) {
    throw new Error(
      `Review submission ${blocking.id} is already ${blocking.attributes.state}. Wait for it to finish before creating another.`,
    );
  }

  const appStoreBuild = await waitForBuild(client, version, build);
  const appStoreVersion = await ensureVersion(client, version);
  await client.request(`/v1/appStoreVersions/${appStoreVersion.id}`, {
    method: "PATCH",
    body: {
      data: {
        type: "appStoreVersions",
        id: appStoreVersion.id,
        attributes: { releaseType: "AFTER_APPROVAL" },
      },
    },
  });
  await client.request(
    `/v1/appStoreVersions/${appStoreVersion.id}/relationships/build`,
    { method: "PATCH", body: buildLinkBody(appStoreBuild.id) },
  );
  await updateWhatsNew(
    client,
    appStoreVersion.id,
    await readFile(whatsNewPath, "utf8"),
  );

  const submission = await client.request("/v1/reviewSubmissions", {
    method: "POST",
    body: reviewSubmissionCreateBody(APP_STORE_APP_ID),
  });
  await client.request("/v1/reviewSubmissionItems", {
    method: "POST",
    body: reviewSubmissionItemCreateBody(
      submission.data.id,
      appStoreVersion.id,
    ),
  });
  await client.request(`/v1/reviewSubmissions/${submission.data.id}`, {
    method: "PATCH",
    body: reviewSubmissionSubmitBody(submission.data.id),
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        version,
        build,
        buildId: appStoreBuild.id,
        appStoreVersionId: appStoreVersion.id,
        reviewSubmissionId: submission.data.id,
        releaseType: "AFTER_APPROVAL",
      },
      null,
      2,
    )}\n`,
  );
}

async function main() {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (command === "status") return status(options);
  if (command === "build") return buildAndMaybeUpload(options);
  if (command === "submit") return submit(options);
  if (command === "release") {
    if (!options.upload || !options["confirm-submit"]) {
      throw new Error("release requires both --upload and --confirm-submit.");
    }
    await buildAndMaybeUpload(options);
    return submit(options);
  }
  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch((error) => {
  process.stderr.write(`\nRelease stopped: ${error.message}\n`);
  process.exitCode = 1;
});
