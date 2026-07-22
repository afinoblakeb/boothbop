import {
  enableFileSharing,
  expect,
  installDemoImages,
  installRemoteConfig,
  openDemoReview,
  test,
} from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test("release announcement appears once and stays dismissed", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Sharing made social")).toBeVisible();
  await expect(
    page.getByText(
      "GIF animations now share as videos, so they work with Instagram and more.",
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Dismiss update" }).click();
  await expect(page.getByText("Sharing made social")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Sharing made social")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("bb.lastSeenRelease")))
    .toBe("0.0.4");
});

test("Edit mode follows the Photos toolbar pattern", async ({ page }) => {
  await openDemoReview(page);
  await page.getByRole("button", { name: "Edit" }).click();

  const editor = page.getByRole("dialog", { name: "Edit photos" });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("button", { name: "Done" })).toBeVisible();
  await expect(
    editor.getByRole("img", { name: "Editing strip" }),
  ).toBeVisible();

  const toolNames = ["Look", "Layout", "Colors"];
  for (const tool of toolNames) {
    await expect(editor.getByRole("button", { name: tool })).toBeVisible();
  }

  await expect(editor.getByRole("button", { name: "Look" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(editor.getByRole("button", { name: "Done" })).toBeFocused();

  const looks = ["Original", "Warm", "Cool", "B&W", "Sepia", "Inverse"];
  const renderedLooks = new Set<string>();
  for (const look of looks) {
    const button = editor.getByRole("button", { name: look, exact: true });
    await expect(button).toBeVisible();
    await expect(
      editor.getByRole("img", { name: `${look} preview` }),
    ).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const preview = editor.getByRole("img", { name: "Editing strip" });
    await expect(preview).toHaveAttribute("src", /^data:image\/png/);
    renderedLooks.add((await preview.getAttribute("src")) ?? "");
  }
  expect(renderedLooks.size, "every look must render distinct pixels").toBe(6);

  await editor.getByRole("button", { name: "Layout" }).click();
  const layout = editor.getByRole("group", { name: "Strip layout" });
  await layout.getByRole("button", { name: "Grid" }).click();
  await expect(layout.getByRole("button", { name: "Grid" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await editor.getByRole("button", { name: "Colors" }).click();
  for (const color of ["Cream", "Rust", "Teal", "Mustard", "Olive", "Carbon"]) {
    const swatch = editor.getByRole("button", { name: color });
    await swatch.click();
    await expect(swatch).toHaveAttribute("aria-pressed", "true");
  }

  await editor.getByRole("button", { name: "Done" }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toBeFocused();
});

test("preview zoom behaves as an isolated, dismissible dialog", async ({
  page,
}) => {
  await openDemoReview(page);
  const zoomTrigger = page.getByRole("button", {
    name: "Zoom in for a closer look",
  });
  await zoomTrigger.click();

  const zoom = page.getByRole("dialog", { name: "Photo preview" });
  await expect(zoom).toBeVisible();
  await expect(zoom.getByRole("button", { name: "Close zoom" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(zoom).toHaveCount(0);
  await expect(zoomTrigger).toBeFocused();
});

test("format tabs support arrow keys and background prep stays scoped", async ({
  page,
}) => {
  await enableFileSharing(page);
  await openDemoReview(page);
  const strip = page.getByRole("tab", { name: "Strip" });
  await strip.focus();
  await page.keyboard.press("ArrowRight");

  const gif = page.getByRole("tab", { name: "GIF" });
  await expect(gif).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("switch", { name: "Boom" })).toBeVisible();
  await page.getByRole("tab", { name: "Strip" }).click();
  await expect(page.getByRole("button", { name: "Share Photo" })).toBeEnabled();
  await expect(page.getByRole("tab", { name: "Video" })).toBeEnabled();
});

test("high-quality masters keep the editor responsive", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { __longTasks?: number[] };
    state.__longTasks = [];
    if (!PerformanceObserver.supportedEntryTypes.includes("longtask")) return;
    new PerformanceObserver((list) => {
      const current = (window as typeof window & { __longTasks?: number[] })
        .__longTasks;
      current?.push(...list.getEntries().map((entry) => entry.duration));
    }).observe({ entryTypes: ["longtask"] });
  });

  await openDemoReview(page);
  const preview = page.getByRole("img", { name: "Your strip" });
  const previewPayload = await preview.evaluate((image) => ({
    width: image.naturalWidth,
    sourceLength: image.src.length,
  }));
  expect(previewPayload.width).toBeLessThan(500);
  expect(previewPayload.sourceLength).toBeLessThan(1_000_000);

  await page.evaluate(() => {
    (window as typeof window & { __longTasks?: number[] }).__longTasks = [];
  });
  await page.getByRole("button", { name: "Edit" }).click();
  const editor = page.getByRole("dialog", { name: "Edit photos" });
  for (const look of ["Warm", "Cool", "B&W", "Sepia", "Inverse"]) {
    const button = editor.getByRole("button", { name: look, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.waitForTimeout(150);

  const longestTask = await page.evaluate(() =>
    Math.max(
      0,
      ...((window as typeof window & { __longTasks?: number[] }).__longTasks ??
        []),
    ),
  );
  expect(longestTask).toBeLessThanOrEqual(100);
});

test("GIF fallback yields between high-quality frame reads", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "OffscreenCanvas", {
      configurable: true,
      value: undefined,
    });
    const original = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      if (args[2] >= 1_000 || args[3] >= 1_000) {
        const until = performance.now() + 60;
        while (performance.now() < until) {
          // Simulate a slow high-resolution read on older WebKit.
        }
      }
      return original.apply(this, args);
    };

    const state = window as typeof window & { __longTasks?: number[] };
    state.__longTasks = [];
    if (!PerformanceObserver.supportedEntryTypes.includes("longtask")) return;
    new PerformanceObserver((list) => {
      state.__longTasks?.push(
        ...list.getEntries().map((entry) => entry.duration),
      );
    }).observe({ entryTypes: ["longtask"] });
  });

  await openDemoReview(page);
  await page.evaluate(() => {
    (window as typeof window & { __longTasks?: number[] }).__longTasks = [];
  });
  await page.getByRole("tab", { name: "GIF" }).click();
  await expect(page.getByRole("status", { name: "" })).toContainText(
    "Making your GIF",
  );
  await expect(page.getByRole("img", { name: "Your gif" })).toBeVisible({
    timeout: 20_000,
  });

  const longestTask = await page.evaluate(() =>
    Math.max(
      0,
      ...((window as typeof window & { __longTasks?: number[] }).__longTasks ??
        []),
    ),
  );
  expect(longestTask).toBeLessThanOrEqual(100);
});

test("GIF Boom toggle updates and persists", async ({ page }) => {
  await openDemoReview(page);
  await expect(
    page.getByRole("button", { name: "Edit" }).locator("svg"),
  ).toHaveClass(/lucide-sliders-horizontal/);
  await page.getByRole("tab", { name: "GIF" }).click();

  const boom = page.getByRole("switch");
  await expect(boom).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("slider", { name: "Boom speed" })).toHaveCount(0);
  await boom.click();
  await expect(boom).toHaveAttribute("aria-checked", "true");
  const speed = page.getByRole("slider", { name: "Boom speed" });
  await expect(speed).toHaveValue("3");
  await speed.fill("2");
  await expect(speed).toHaveValue("2");
  const gif = page.getByRole("img", { name: "Your gif" });
  await expect(gif).toBeVisible();
  await expect
    .poll(() => gif.evaluate((image) => image.naturalWidth))
    .toBe(1080);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("bb.boom")))
    .toBe("1");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("bb.boomSpeed")))
    .toBe("2");
});

test("GIF sharing creates a compatible MP4 and preserves the original GIF", async ({
  page,
}) => {
  await enableFileSharing(page);
  await openDemoReview(page);
  await page.getByRole("tab", { name: "GIF" }).click();
  await expect(page.getByRole("img", { name: "Your gif" })).toBeVisible();

  await expect(page.getByRole("status")).toHaveText(
    "Preparing high-quality share…",
  );
  const shareAnimation = page.getByRole("button", {
    name: "Share Animation",
  });
  await expect(shareAnimation).toBeEnabled({ timeout: 15_000 });
  await shareAnimation.click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __sharePayloads?: {
                  files: { name: string; type: string; size: number }[];
                }[];
              }
            ).__sharePayloads?.[0]?.files[0],
        ),
      { timeout: 15_000 },
    )
    .toMatchObject({
      name: expect.stringMatching(/^boothbop-animation-.*\.mp4$/),
      type: "video/mp4",
      size: expect.any(Number),
    });

  const media = await page.evaluate(async () => {
    const file = (
      window as typeof window & {
        __sharedFiles?: File[];
      }
    ).__sharedFiles?.[0];
    if (!file) throw new Error("No shared social video was captured.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const containsAscii = (text: string) => {
      const needle = new TextEncoder().encode(text);
      return bytes.some((_, start) =>
        needle.every((value, offset) => bytes[start + offset] === value),
      );
    };
    const url = URL.createObjectURL(file);
    const metadata = await new Promise<{
      duration: number;
      width: number;
      height: number;
      topPixel: number[];
      centerPixel: number[];
      bottomPixel: number[];
    }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.onloadedmetadata = () => {
        video.currentTime = 0.1;
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Canvas is unavailable."));
        context.drawImage(video, 0, 0);
        const pixel = (x: number, y: number) =>
          [...context.getImageData(x, y, 1, 1).data].slice(0, 3);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          topPixel: pixel(540, 100),
          centerPixel: pixel(540, 960),
          bottomPixel: pixel(540, 1820),
        });
      };
      video.onerror = () => reject(new Error("Generated MP4 is not playable."));
      video.src = url;
    });
    URL.revokeObjectURL(url);

    return {
      ...metadata,
      hasMp4Container: containsAscii("ftyp"),
      hasAvcVideo: containsAscii("avc1"),
      hasUnexpectedAacAudio: containsAscii("mp4a"),
    };
  });

  expect(media).toMatchObject({
    width: 1080,
    height: 1920,
    hasMp4Container: true,
    hasAvcVideo: true,
    hasUnexpectedAacAudio: false,
  });
  // MediaRecorder container timestamps can trim the first/last encoded frame;
  // the social contract is a useful roughly-five-second animation.
  expect(media.duration).toBeGreaterThanOrEqual(4.5);
  expect(media.duration).toBeLessThanOrEqual(6);
  const cream = [246, 231, 207];
  const colorDistance = (left: number[], right: number[]) =>
    left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0);
  expect(colorDistance(media.topPixel, cream)).toBeLessThan(25);
  expect(colorDistance(media.bottomPixel, cream)).toBeLessThan(25);
  expect(colorDistance(media.centerPixel, media.topPixel)).toBeGreaterThan(40);

  await page.getByRole("button", { name: "Share Original GIF" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __sharePayloads?: {
                files: { name: string; type: string; size: number }[];
              }[];
            }
          ).__sharePayloads?.[1]?.files[0],
      ),
    )
    .toMatchObject({
      name: expect.stringMatching(/^boothbop-.*\.gif$/),
      type: "image/gif",
      size: expect.any(Number),
    });

  const started = Date.now();
  await shareAnimation.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __shareCalls?: number }).__shareCalls ??
          0,
      ),
    )
    .toBe(3);
  expect(
    Date.now() - started,
    "repeat sharing should reuse the MP4",
  ).toBeLessThan(1_500);
});

test("GIF sharing does not promise social video without MP4 support", async ({
  page,
}) => {
  await enableFileSharing(page);
  await page.addInitScript(() => {
    const supported = MediaRecorder.isTypeSupported.bind(MediaRecorder);
    MediaRecorder.isTypeSupported = (type: string) =>
      type.startsWith("video/mp4") ? false : supported(type);
  });
  await openDemoReview(page);
  await page.getByRole("tab", { name: "GIF" }).click();
  await expect(page.getByRole("button", { name: "Share GIF" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Share Animation" }),
  ).toHaveCount(0);
});

test("social-video failure preserves an actionable GIF fallback", async ({
  page,
}) => {
  await enableFileSharing(page);
  await page.addInitScript(() => {
    const ActualMediaRecorder = MediaRecorder;
    class BrokenMediaRecorder extends ActualMediaRecorder {
      static isTypeSupported(type: string) {
        return type.startsWith("video/mp4");
      }

      constructor() {
        throw new Error("intentional encoder failure");
      }
    }
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: BrokenMediaRecorder,
    });
  });
  await openDemoReview(page);
  await page.getByRole("tab", { name: "GIF" }).click();
  await page.getByRole("button", { name: "Share Animation" }).click();

  await expect(
    page.getByText(
      "Couldn't prepare a social video. You can still share the original GIF.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Share Original GIF" }),
  ).toBeEnabled();
});

test("Retake One picker can enter and cancel a retake without losing review", async ({
  page,
}) => {
  await openDemoReview(page);
  await page.getByRole("button", { name: "Retake One" }).click();

  const picker = page.getByLabel("Choose a photo to retake");
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole("button", { name: /Retake photo/ }),
  ).toHaveCount(4);
  await page.getByRole("button", { name: "Retake photo 2" }).click();
  await expect(
    page.getByRole("button", { name: "Retake Photo 2" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retake One" })).toBeVisible();
});

test("branding setting persists across a reload", async ({ page }) => {
  await installDemoImages(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();

  const brandingRow = page.locator("div", {
    has: page.getByText("BoothBop branding", { exact: true }),
  });
  const branding = brandingRow.getByRole("switch");
  await expect(branding).toHaveAttribute("aria-checked", "true");
  await branding.click();
  await expect(branding).toHaveAttribute("aria-checked", "false");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("bb.branding")))
    .toBe("0");

  await page.reload();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page
      .locator("div", {
        has: page.getByText("BoothBop branding", { exact: true }),
      })
      .getByRole("switch"),
  ).toHaveAttribute("aria-checked", "false");
});

test("reviewed features can be remotely disabled without loading code", async ({
  page,
}) => {
  await installRemoteConfig(page, {
    editor: false,
    gif: false,
    video: false,
    boom: false,
    retakeOne: false,
    brandingControl: false,
  });
  await openDemoReview(page);

  await expect(page.getByRole("tab", { name: "Strip" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "GIF" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Video" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retake One" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Share Photo|Save Photo/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByText("BoothBop branding", { exact: true }),
  ).toHaveCount(0);
});
