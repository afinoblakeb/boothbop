import { enableFileSharing, expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

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

test("rapid settings transitions cannot strand the native camera black", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      __nativeCamera?: {
        running: boolean;
        starting: boolean;
        previewVisible: boolean;
        starts: number;
        stops: number;
      };
      Capacitor?: Record<string, unknown>;
      webkit?: unknown;
    };
    state.__nativeCamera = {
      running: false,
      starting: false,
      previewVisible: false,
      starts: 0,
      stops: 0,
    };
    Object.defineProperty(window, "webkit", {
      configurable: true,
      value: { messageHandlers: { bridge: {} } },
    });
    state.Capacitor = {
      PluginHeaders: [
        {
          name: "BoothBopCamera",
          methods: [
            ...[
              "isAvailable",
              "start",
              "setPreviewFrame",
              "capture",
              "release",
              "stop",
              "removeListener",
            ].map((name) => ({ name, rtype: "promise" })),
            { name: "addListener", rtype: "callback" },
          ],
        },
      ],
      nativeCallback: async (
        pluginName: string,
        methodName: string,
        _options: Record<string, unknown>,
        _callback: (result: Record<string, unknown>) => void,
      ) => {
        if (pluginName !== "BoothBopCamera" || methodName !== "addListener") {
          throw new Error(
            `Unexpected native callback: ${pluginName}.${methodName}`,
          );
        }
        return "camera-state-listener";
      },
      nativePromise: async (
        pluginName: string,
        methodName: string,
      ): Promise<Record<string, unknown>> => {
        if (pluginName !== "BoothBopCamera") {
          throw new Error(`Unexpected native plugin: ${pluginName}`);
        }
        const camera = state.__nativeCamera!;
        if (methodName === "isAvailable") return { available: true };
        if (methodName === "start") {
          camera.starts += 1;
          if (camera.running) return { width: 1920, height: 1080 };
          if (camera.starting) throw new Error("Camera start is already busy");
          camera.starting = true;
          await new Promise((resolve) => setTimeout(resolve, 180));
          camera.starting = false;
          camera.running = true;
          return { width: 1920, height: 1080 };
        }
        if (methodName === "stop") {
          camera.stops += 1;
          await new Promise((resolve) => setTimeout(resolve, 40));
          camera.running = false;
          camera.previewVisible = false;
          return { stopped: true };
        }
        if (methodName === "setPreviewFrame") {
          if (!camera.running) throw new Error("Camera is not running");
          camera.previewVisible = true;
          return { visible: true };
        }
        if (methodName === "removeListener") return { removed: true };
        if (methodName === "release") return { released: true };
        throw new Error(`Unexpected camera method: ${methodName}`);
      },
    };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException(
          "Native camera owns the device",
          "NotReadableError",
        );
      },
    });
  });

  await page.goto("/?native=1");
  await expect(page.getByRole("button", { name: "Take Photos" })).toBeVisible();

  const settings = page.getByRole("button", { name: "Settings" });
  await settings.click();
  await page.getByRole("button", { name: "Close" }).click();
  await settings.click();
  await page.getByRole("button", { name: "Close" }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const camera = (
            window as typeof window & {
              __nativeCamera?: {
                running: boolean;
                previewVisible: boolean;
              };
            }
          ).__nativeCamera;
          return Boolean(camera?.running && camera.previewVisible);
        }),
      { timeout: 5_000 },
    )
    .toBe(true);
  await expect(page.getByRole("button", { name: "Take Photos" })).toBeEnabled();

  const startsBeforeBackground = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __nativeCamera?: { starts: number };
        }
      ).__nativeCamera?.starts ?? 0,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !(
            window as typeof window & {
              __nativeCamera?: { running: boolean };
            }
          ).__nativeCamera?.running,
      ),
    )
    .toBe(true);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __nativeCamera?: {
                  running: boolean;
                  previewVisible: boolean;
                  starts: number;
                };
              }
            ).__nativeCamera,
        ),
      { timeout: 5_000 },
    )
    .toMatchObject({
      running: true,
      previewVisible: true,
      starts: startsBeforeBackground + 1,
    });

  await page
    .getByRole("group", { name: "Countdown seconds" })
    .getByRole("button", { name: "1s" })
    .click();
  await page.getByRole("button", { name: "Take Photos" }).click();
  await expect(
    page.getByText("Couldn't take that photo. Try again."),
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole("button", { name: "Try Camera Again" }),
  ).toBeVisible();
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
      { timeout: 6_000 },
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
  expect(timing.interval).toBeGreaterThanOrEqual(1_400);
  expect(timing.interval).toBeLessThan(1_950);
  await page.getByRole("button", { name: "Cancel" }).click();
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
