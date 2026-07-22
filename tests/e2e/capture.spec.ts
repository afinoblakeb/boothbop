import { enableFileSharing, expect, test } from "./fixtures";
import {
  installNativeCameraMock,
  nativeCameraSnapshot,
  resolveNativeStart,
  requestNativePreviewUpdate,
  setDocumentVisibility,
  settleNativePreview,
  waitForNativeCamera,
} from "../../test-support/mocks/nativeCamera";

test.use({ viewport: { width: 390, height: 844 } });

const REQUIRED_SHUTTER_FREEZE_MS = 600;
const LIVE_PREVIEW_RECOVERY_MS = 50;
const SELECTED_COUNTDOWN_MS = 1_000;

test("native launch opens one camera preview without a home-screen tap", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async (...args: Parameters<typeof original>) => {
        const state = window as typeof window & { __cameraCalls?: number };
        state.__cameraCalls = (state.__cameraCalls ?? 0) + 1;
        return original(...args);
      },
    });
  });

  await page.goto("/?native=1");

  await expect(page.locator("video")).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "My Photos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __cameraCalls?: number }).__cameraCalls,
      ),
    )
    .toBe(1);

  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("video")).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __cameraCalls?: number }).__cameraCalls,
      ),
    )
    .toBe(1);
});

test("native camera failure stays on a recoverable camera surface", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied for test", "NotAllowedError");
      },
    });
  });

  await page.goto("/?native=1");

  await expect(page.getByText(/requires camera permission/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try Camera Again" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Take Photos" })).toHaveCount(
    0,
  );
});

test("native launch survives unavailable preference storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
  });

  await page.goto("/?native=1");

  await expect(page.getByRole("button", { name: "Take Photos" })).toBeVisible();
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test("repeated settings churn ignores stale native preview completions", async ({
  page,
}) => {
  await installNativeCameraMock(page);

  await page.goto("/?native=1");
  await expect(page.getByRole("button", { name: "Take Photos" })).toBeVisible();
  await waitForNativeCamera(page, {
    running: true,
    starts: 1,
    previewCalls: [{ id: 1, status: "pending" }],
  });
  await settleNativePreview(page, 1, "resolve");
  await expect(page.locator("html")).toHaveClass(/native-camera-active/);

  const settings = page.getByRole("button", { name: "Settings" });
  const dialog = page.getByRole("dialog", { name: "Settings" });
  for (let transition = 1; transition <= 5; transition += 1) {
    await requestNativePreviewUpdate(page);
    await expect
      .poll(async () => (await nativeCameraSnapshot(page)).previewCalls.length)
      .toBe(transition * 2);
    const stale = (await nativeCameraSnapshot(page)).previewCalls.at(-1)!;

    await settings.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await waitForNativeCamera(page, {
      running: true,
      starts: transition + 1,
      stops: transition,
    });
    await expect
      .poll(async () => (await nativeCameraSnapshot(page)).previewCalls.length)
      .toBe(transition * 2 + 1);
    const current = (await nativeCameraSnapshot(page)).previewCalls.at(-1)!;
    await settleNativePreview(page, current.id, "resolve");
    await expect(page.locator("html")).toHaveClass(/native-camera-active/);
    await settleNativePreview(
      page,
      stale.id,
      transition % 2 === 0 ? "resolve" : "reject",
    );
    await expect(page.locator("html")).toHaveClass(/native-camera-active/);
    await expect(
      page.getByText("Couldn't start the iPhone camera."),
    ).toHaveCount(0);
  }

  await expect(page.getByRole("button", { name: "Take Photos" })).toBeVisible();
  await expect(dialog).toBeHidden();
  await waitForNativeCamera(page, {
    running: true,
    previewVisible: true,
    starts: 6,
    stops: 5,
  });
});

test("repeated background recovery keeps only the newest native preview", async ({
  page,
}) => {
  await installNativeCameraMock(page);

  await page.goto("/?native=1");
  await waitForNativeCamera(page, {
    running: true,
    starts: 1,
    previewCalls: [{ id: 1, status: "pending" }],
  });
  await settleNativePreview(page, 1, "resolve");
  await expect(page.locator("html")).toHaveClass(/native-camera-active/);

  for (let transition = 1; transition <= 4; transition += 1) {
    await requestNativePreviewUpdate(page);
    await expect
      .poll(async () => (await nativeCameraSnapshot(page)).previewCalls.length)
      .toBe(transition * 2);
    const stale = (await nativeCameraSnapshot(page)).previewCalls.at(-1)!;

    await setDocumentVisibility(page, "hidden");
    await waitForNativeCamera(page, {
      running: false,
      stops: transition,
    });
    await setDocumentVisibility(page, "visible");
    await waitForNativeCamera(page, {
      running: true,
      starts: transition + 1,
    });
    await expect
      .poll(async () => (await nativeCameraSnapshot(page)).previewCalls.length)
      .toBe(transition * 2 + 1);
    const current = (await nativeCameraSnapshot(page)).previewCalls.at(-1)!;
    await settleNativePreview(page, current.id, "resolve");
    await expect(page.locator("html")).toHaveClass(/native-camera-active/);
    await settleNativePreview(
      page,
      stale.id,
      transition % 2 === 0 ? "resolve" : "reject",
    );
    await expect(page.locator("html")).toHaveClass(/native-camera-active/);
    await expect(
      page.getByText("Couldn't start the iPhone camera."),
    ).toHaveCount(0);
  }

  await expect(page.getByRole("button", { name: "Take Photos" })).toBeVisible();
  await waitForNativeCamera(page, {
    running: true,
    previewVisible: true,
    starts: 5,
    stops: 4,
  });
});

test("backgrounding during native startup cancels and restarts the camera", async ({
  page,
}) => {
  await installNativeCameraMock(page, { deferStart: true });

  await page.goto("/?native=1");
  await waitForNativeCamera(page, { starts: 1, pendingStarts: 1 });

  await setDocumentVisibility(page, "hidden");
  await resolveNativeStart(page);
  await waitForNativeCamera(page, { running: false, starts: 1, stops: 1 });

  await setDocumentVisibility(page, "visible");
  await waitForNativeCamera(page, { starts: 2, pendingStarts: 1 });
  await resolveNativeStart(page);
  await waitForNativeCamera(page, {
    running: true,
    starts: 2,
    stops: 1,
    previewCalls: [{ id: 1, status: "pending" }],
  });
  await settleNativePreview(page, 1, "resolve");
  await expect(page.locator("html")).toHaveClass(/native-camera-active/);
});

test("rapid navigation never mounts gallery and settings together", async ({
  page,
}) => {
  await installNativeCameraMock(page);

  await page.goto("/?native=1");
  await waitForNativeCamera(page, {
    running: true,
    previewCalls: [{ id: 1, status: "pending" }],
  });
  await settleNativePreview(page, 1, "resolve");

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const photos = buttons.find(
      (button) => button.getAttribute("aria-label") === "My Photos",
    );
    const settings = buttons.find(
      (button) => button.getAttribute("aria-label") === "Settings",
    );
    photos?.click();
    settings?.click();
  });

  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
});

test("camera opening is visible and duplicate-proof", async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async (...args: Parameters<typeof original>) => {
        const state = window as typeof window & { __cameraCalls?: number };
        state.__cameraCalls = (state.__cameraCalls ?? 0) + 1;
        await new Promise((resolve) => setTimeout(resolve, 150));
        return original(...args);
      },
    });
  });
  await page.goto("/");
  const start = page.getByRole("button", { name: "Take Photos" });
  await start.evaluate((button) => {
    button.click();
    button.click();
  });

  await expect(
    page.getByRole("button", { name: "Opening Camera…" }),
  ).toBeDisabled();
  await expect(page.locator("video")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __cameraCalls?: number }).__cameraCalls,
      ),
    )
    .toBe(1);
});

test("a slow full-resolution capture freezes the photo without a white flash", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class SlowImageCapture {
      constructor(_track: MediaStreamTrack) {}

      async takePhoto(): Promise<Blob> {
        const state = window as typeof window & {
          __shutterStarted?: boolean;
          __freezeVisibleNextFrame?: boolean;
          __photoResolved?: boolean;
        };
        state.__shutterStarted = true;
        window.requestAnimationFrame(() => {
          state.__freezeVisibleNextFrame = Boolean(
            document.querySelector('[aria-label="Captured photo preview"]'),
          );
        });
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing test canvas context");
        context.fillStyle = "#3e7c78";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error("Test capture failed")),
            "image/png",
          ),
        );
        state.__photoResolved = true;
        return blob;
      }
    }

    Object.defineProperty(globalThis, "ImageCapture", {
      configurable: true,
      value: SlowImageCapture,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __shutterStarted?: boolean })
            .__shutterStarted,
      ),
    )
    .toBe(true);
  await expect(page.locator(".flash")).toHaveCount(0);
  const frozenPreview = page.getByLabel("Captured photo preview");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __freezeVisibleNextFrame?: boolean;
            }
          ).__freezeVisibleNextFrame,
      ),
    )
    .toBe(true);
  await page.waitForTimeout(300);
  await expect(frozenPreview).toBeVisible();
  await page.waitForTimeout(150);
  await expect(frozenPreview).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __photoResolved?: boolean })
            .__photoResolved,
      ),
    )
    .toBe(true);
  await page.waitForTimeout(50);
  await expect(frozenPreview).toHaveCount(0);
});

test("every shot gets the full selected countdown after freeze recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class TimedImageCapture {
      constructor(_track: MediaStreamTrack) {}

      async takePhoto(): Promise<Blob> {
        const state = window as typeof window & { __shutterTimes?: number[] };
        state.__shutterTimes ??= [];
        state.__shutterTimes.push(performance.now());

        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        canvas.getContext("2d")?.fillRect(0, 0, 32, 32);
        return await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((blob) =>
            blob ? resolve(blob) : reject(new Error("Test capture failed")),
          ),
        );
      }
    }

    Object.defineProperty(globalThis, "ImageCapture", {
      configurable: true,
      value: TimedImageCapture,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  const sequenceStartedAt = await page.evaluate(() => performance.now());
  await page.getByRole("button", { name: "Take Photos" }).click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as typeof window & { __shutterTimes?: number[] })
              .__shutterTimes?.length ?? 0,
        ),
      { timeout: 8_000 },
    )
    .toBeGreaterThanOrEqual(2);

  const timing = await page.evaluate((startedAt) => {
    const times = (window as typeof window & { __shutterTimes?: number[] })
      .__shutterTimes;
    if (!times || times.length < 2) throw new Error("Missing shutter times");
    return {
      firstShutter: times[0] - startedAt,
      interval: times[1] - times[0],
    };
  }, sequenceStartedAt);
  expect(timing.firstShutter).toBeGreaterThanOrEqual(3_200);
  expect(timing.firstShutter).toBeLessThan(4_200);
  expect(timing.interval).toBeGreaterThanOrEqual(
    REQUIRED_SHUTTER_FREEZE_MS +
      LIVE_PREVIEW_RECOVERY_MS +
      SELECTED_COUNTDOWN_MS,
  );
  expect(timing.interval).toBeLessThan(2_200);
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("the fourth photo stays frozen through slow capture processing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class SlowFinalImageCapture {
      constructor(_track: MediaStreamTrack) {}

      async takePhoto(): Promise<Blob> {
        const state = window as typeof window & { __captureCount?: number };
        state.__captureCount = (state.__captureCount ?? 0) + 1;
        if (state.__captureCount === 4) {
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        }
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        canvas.getContext("2d")?.fillRect(0, 0, 32, 32);
        return await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((blob) =>
            blob ? resolve(blob) : reject(new Error("Test capture failed")),
          ),
        );
      }
    }

    Object.defineProperty(globalThis, "ImageCapture", {
      configurable: true,
      value: SlowFinalImageCapture,
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.evaluate(() => {
    const state = window as typeof window & {
      __fourthShotPaintedBeforeReview?: boolean;
    };
    state.__fourthShotPaintedBeforeReview = false;
    const observer = new MutationObserver(() => {
      const fourthShot = document.querySelector('img[alt="Shot 4"]');
      const review = document.querySelector('img[alt="Your strip"]');
      if (fourthShot && !review) {
        state.__fourthShotPaintedBeforeReview = true;
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "Take Photos" }).click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as typeof window & { __captureCount?: number })
              .__captureCount ?? 0,
        ),
      { timeout: 12_000 },
    )
    .toBe(4);

  const frozenPreview = page.getByLabel("Captured photo preview");
  await expect(frozenPreview).toBeVisible();
  await page.waitForTimeout(700);
  await expect(frozenPreview).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Share Photo|Save Photo/ }),
  ).toBeVisible({ timeout: 3_000 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __fourthShotPaintedBeforeReview?: boolean;
            }
          ).__fourthShotPaintedBeforeReview,
      ),
    )
    .toBe(true);
});

test("slow gallery persistence never delays the review screen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      window.setTimeout(
        () => original.call(this, callback, type, quality),
        4_000,
      );
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).click();

  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible({
    timeout: 12_000,
  });
});

test("two synchronous shutter taps create one photo session", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).evaluate((button) => {
    button.click();
    button.click();
  });

  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Camera" }).click();
  await expect(page.locator("video")).toBeVisible();
  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(
    page.getByRole("button", { name: "Open photo set" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Open photo set" }).click();
  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible();
  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await page.getByRole("button", { name: "Select" }).click();
  await page.getByRole("button", { name: "Select photo set" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete 1 selected photo set" })
    .click();
  await expect(page.getByText("No photos yet")).toBeVisible();
});

test("closing My Photos cancels an in-flight session open", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).click();
  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(
    page.getByRole("button", { name: "Open photo set" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(
    page.getByRole("button", { name: "Open photo set" }),
  ).toBeVisible();

  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      IDBRequest.prototype,
      "onsuccess",
    );
    const originalGet = descriptor?.get;
    const originalSet = descriptor?.set;
    Object.defineProperty(IDBRequest.prototype, "onsuccess", {
      configurable: true,
      get: originalGet,
      set(handler: ((this: IDBRequest, event: Event) => unknown) | null) {
        if (!originalSet || !handler) {
          originalSet?.call(this, handler);
          return;
        }
        originalSet.call(this, function (event: Event) {
          window.setTimeout(() => handler.call(this, event), 600);
        });
      },
    });
  });

  await page.getByRole("button", { name: "Open photo set" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(2_000);
  await expect(page.getByRole("button", { name: "Take Photos" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Your strip" })).toHaveCount(0);
});

test("captures four camera frames and reaches Share Photo", async ({
  page,
}) => {
  await enableFileSharing(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Take Photos" }).click();

  await expect(page.locator("video")).toBeVisible();
  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).click();

  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible({
    timeout: 20_000,
  });
  const save = page.getByRole("button", { name: "Share Photo" });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(
    page.getByText("Your high-quality photo is ready. Tap Share Photo again."),
  ).toBeVisible();
  await save.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __shareCalls?: number }).__shareCalls ??
          0,
      ),
    )
    .toBe(1);
  const sharedStrip = await page.evaluate(async () => {
    const file = (window as typeof window & { __sharedFiles?: File[] })
      .__sharedFiles?.[0];
    if (!file) return null;
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  });
  expect(sharedStrip).not.toBeNull();
  expect(sharedStrip!.height).toBe(sharedStrip!.width * 3);

  await page.getByRole("button", { name: "Retake One" }).click();
  await page.getByRole("button", { name: "Choose photo 2 to retake" }).click();
  await page
    .getByRole("button", { name: "Retake Photo 2" })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(
    page.getByRole("button", { name: "Open photo set" }),
  ).toHaveCount(1);
});
