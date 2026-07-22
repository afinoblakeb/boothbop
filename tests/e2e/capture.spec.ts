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
  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(
    page.getByRole("button", { name: "Open photo set" }),
  ).toHaveCount(1);
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
