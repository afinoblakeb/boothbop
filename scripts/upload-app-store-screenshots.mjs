#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createAppStoreClient } from "./lib/asc-client.mjs";
import {
  APP_STORE_SCREENSHOT_DEVICES,
  APP_STORE_SCREENSHOT_SCENES,
  expectedScreenshotCount,
} from "./lib/app-store-screenshot-contract.mjs";
import {
  cancelReviewSubmissionBody,
  commitScreenshotBody,
  createScreenshotBody,
  createScreenshotSetBody,
  screenshotSetIsCurrent,
} from "./lib/app-store-screenshot-upload-contract.mjs";
import { APP_STORE_APP_ID } from "./lib/release-contract.mjs";

const ROOT = process.cwd();
const SCREENSHOT_ROOT = path.join(ROOT, "build", "app-store", "screenshots");
const ACTIVE_REVIEW_STATES = new Set([
  "READY_FOR_REVIEW",
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "CANCELING",
  "COMPLETING",
]);

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function requiredOption(options, key) {
  const value = options[key];
  if (typeof value !== "string") throw new Error(`Missing --${key}.`);
  return value;
}

function queryPath(resourcePath, query) {
  return `${resourcePath}?${new URLSearchParams(query)}`;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findVersion(client, version) {
  const payload = await client.request(
    queryPath(`/v1/apps/${APP_STORE_APP_ID}/appStoreVersions`, {
      "filter[platform]": "IOS",
      limit: "50",
    }),
  );
  return payload.data.find((item) => item.attributes.versionString === version);
}

async function findLocalization(client, versionId, locale) {
  const payload = await client.request(
    queryPath(
      `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
      { "filter[locale]": locale, limit: "10" },
    ),
  );
  return payload.data[0];
}

async function activeReviewSubmission(client) {
  const payload = await client.request(
    queryPath(`/v1/apps/${APP_STORE_APP_ID}/reviewSubmissions`, {
      limit: "20",
    }),
  );
  return payload.data.find((item) =>
    ACTIVE_REVIEW_STATES.has(item.attributes.state),
  );
}

async function cancelActiveReview(client, confirmed) {
  const active = await activeReviewSubmission(client);
  if (!active) return null;
  if (!confirmed) {
    throw new Error(
      `Review submission ${active.id} is ${active.attributes.state}. Add --confirm-cancel-review to make screenshots editable.`,
    );
  }
  if (active.attributes.state !== "CANCELING") {
    await client.request(`/v1/reviewSubmissions/${active.id}`, {
      method: "PATCH",
      body: cancelReviewSubmissionBody(active.id),
    });
  }
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const payload = await client.request(`/v1/reviewSubmissions/${active.id}`);
    const state = payload.data.attributes.state;
    process.stdout.write(`Review cancellation: ${state}\n`);
    if (!ACTIVE_REVIEW_STATES.has(state)) return active.id;
    await wait(5_000);
  }
  throw new Error(`Timed out canceling review submission ${active.id}.`);
}

async function listScreenshotSets(client, localizationId) {
  const payload = await client.request(
    queryPath(
      `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`,
      { limit: "50" },
    ),
  );
  return payload.data;
}

async function ensureScreenshotSet(
  client,
  localizationId,
  displayType,
  existingSets,
) {
  const existing = existingSets.find(
    (item) => item.attributes.screenshotDisplayType === displayType,
  );
  if (existing) return existing;
  const created = await client.request("/v1/appScreenshotSets", {
    method: "POST",
    body: createScreenshotSetBody(localizationId, displayType),
  });
  existingSets.push(created.data);
  return created.data;
}

async function listScreenshots(client, setId) {
  const payload = await client.request(
    queryPath(`/v1/appScreenshotSets/${setId}/appScreenshots`, {
      "fields[appScreenshots]":
        "fileName,sourceFileChecksum,assetDeliveryState",
      limit: "50",
    }),
  );
  return payload.data;
}

async function uploadReservedAsset(operations, fileBuffer) {
  for (const operation of operations) {
    const offset = Number(operation.offset ?? 0);
    const length = Number(operation.length ?? fileBuffer.length);
    const headers = Object.fromEntries(
      (operation.requestHeaders ?? []).map(({ name, value }) => [name, value]),
    );
    const response = await fetch(operation.url, {
      method: operation.method ?? "PUT",
      headers,
      body: fileBuffer.subarray(offset, offset + length),
    });
    if (!response.ok) {
      throw new Error(
        `Screenshot asset transfer failed (${response.status} ${response.statusText}).`,
      );
    }
  }
}

async function waitForScreenshot(client, screenshotId) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const payload = await client.request(`/v1/appScreenshots/${screenshotId}`);
    const delivery = payload.data.attributes.assetDeliveryState;
    const state = delivery?.state ?? "PROCESSING";
    if (state === "COMPLETE") return payload.data;
    if (state === "FAILED") {
      const errors = (delivery.errors ?? [])
        .map((error) => error.description ?? error.code)
        .filter(Boolean)
        .join("; ");
      throw new Error(
        `Apple rejected screenshot ${payload.data.attributes.fileName}${
          errors ? `: ${errors}` : ""
        }.`,
      );
    }
    await wait(2_000);
  }
  throw new Error(`Timed out processing screenshot ${screenshotId}.`);
}

async function uploadScreenshot(client, setId, filePath, fileName) {
  const [fileBuffer, fileStats] = await Promise.all([
    readFile(filePath),
    stat(filePath),
  ]);
  const checksum = createHash("md5").update(fileBuffer).digest("hex");
  const reservation = await client.request("/v1/appScreenshots", {
    method: "POST",
    body: createScreenshotBody(setId, fileName, fileStats.size),
  });
  await uploadReservedAsset(
    reservation.data.attributes.uploadOperations,
    fileBuffer,
  );
  await client.request(`/v1/appScreenshots/${reservation.data.id}`, {
    method: "PATCH",
    body: commitScreenshotBody(reservation.data.id, checksum),
  });
  return waitForScreenshot(client, reservation.data.id);
}

async function localChecksum(device, fileName) {
  return createHash("md5")
    .update(await readFile(path.join(SCREENSHOT_ROOT, device.label, fileName)))
    .digest("hex");
}

async function replaceScreenshotSet(client, set, device) {
  const desiredNames = new Set(
    APP_STORE_SCREENSHOT_SCENES.map((scene) => scene.fileName),
  );
  let current = await listScreenshots(client, set.id);
  const expectedChecksums = new Map(
    await Promise.all(
      APP_STORE_SCREENSHOT_SCENES.map(async (scene) => [
        scene.fileName,
        await localChecksum(device, scene.fileName),
      ]),
    ),
  );
  const checksumDeadline = Date.now() + 30_000;
  while (
    current.length === expectedChecksums.size &&
    current.every(
      (item) => item.attributes.assetDeliveryState?.state === "COMPLETE",
    ) &&
    current.some((item) => !item.attributes.sourceFileChecksum) &&
    Date.now() < checksumDeadline
  ) {
    await wait(2_000);
    current = await listScreenshots(client, set.id);
  }
  if (screenshotSetIsCurrent(current, expectedChecksums)) {
    process.stdout.write(`${device.displayType} is already current.\n`);
    return {
      screenshotIds: current.map((item) => item.id),
      uploadedScreenshotCount: 0,
    };
  }

  for (const screenshot of current.filter((item) =>
    desiredNames.has(item.attributes.fileName),
  )) {
    await client.request(`/v1/appScreenshots/${screenshot.id}`, {
      method: "DELETE",
    });
  }

  const preserved = current.filter(
    (item) => !desiredNames.has(item.attributes.fileName),
  );
  if (preserved.length + APP_STORE_SCREENSHOT_SCENES.length > 10) {
    throw new Error(
      `${device.displayType} has ${preserved.length} existing screenshots; adding five would exceed Apple's ten-screenshot limit.`,
    );
  }

  const uploaded = [];
  for (const scene of APP_STORE_SCREENSHOT_SCENES) {
    process.stdout.write(
      `Uploading ${device.displayType}/${scene.fileName}...\n`,
    );
    uploaded.push(
      await uploadScreenshot(
        client,
        set.id,
        path.join(SCREENSHOT_ROOT, device.label, scene.fileName),
        scene.fileName,
      ),
    );
  }

  for (const screenshot of preserved) {
    await client.request(`/v1/appScreenshots/${screenshot.id}`, {
      method: "DELETE",
    });
  }

  const finalScreenshots = await listScreenshots(client, set.id);
  const finalNames = finalScreenshots.map((item) => item.attributes.fileName);
  const expectedNames = APP_STORE_SCREENSHOT_SCENES.map(
    (scene) => scene.fileName,
  );
  if (
    finalScreenshots.length !== expectedNames.length ||
    expectedNames.some((name) => !finalNames.includes(name))
  ) {
    throw new Error(
      `${device.displayType} verification failed: ${finalNames.join(", ")}`,
    );
  }
  return {
    screenshotIds: uploaded.map((item) => item.id),
    uploadedScreenshotCount: uploaded.length,
  };
}

async function validateLocalManifest() {
  const manifest = JSON.parse(
    await readFile(path.join(SCREENSHOT_ROOT, "manifest.json"), "utf8"),
  );
  if (manifest.length !== expectedScreenshotCount()) {
    throw new Error(
      `Screenshot manifest has ${manifest.length} entries; expected ${expectedScreenshotCount()}.`,
    );
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options["confirm-replace"]) {
    throw new Error("Screenshot replacement requires --confirm-replace.");
  }
  const versionString = requiredOption(options, "version");
  const locale = typeof options.locale === "string" ? options.locale : "en-US";
  await validateLocalManifest();

  const client = await createAppStoreClient();
  const version = await findVersion(client, versionString);
  if (!version) {
    throw new Error(`App Store version ${versionString} was not found.`);
  }
  const canceledSubmissionId = await cancelActiveReview(
    client,
    options["confirm-cancel-review"] === true,
  );
  const localization = await findLocalization(client, version.id, locale);
  if (!localization) {
    throw new Error(
      `Localization ${locale} was not found for version ${versionString}.`,
    );
  }

  const sets = await listScreenshotSets(client, localization.id);
  const result = [];
  for (const device of APP_STORE_SCREENSHOT_DEVICES) {
    const set = await ensureScreenshotSet(
      client,
      localization.id,
      device.displayType,
      sets,
    );
    const replacement = await replaceScreenshotSet(client, set, device);
    result.push({
      displayType: device.displayType,
      setId: set.id,
      screenshotIds: replacement.screenshotIds,
      uploadedScreenshotCount: replacement.uploadedScreenshotCount,
    });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        version: versionString,
        locale,
        canceledSubmissionId,
        uploadedScreenshotCount: result.reduce(
          (total, item) => total + item.uploadedScreenshotCount,
          0,
        ),
        sets: result,
        submittedForReview: false,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`\nScreenshot upload stopped: ${error.message}\n`);
  process.exitCode = 1;
});
