import {
  expect,
  test as playwrightTest,
  type Locator,
  type Page,
} from "@playwright/test";

export const test = playwrightTest.extend<{ applicationErrors: string[] }>({
  applicationErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await page.route(/https:\/\/boothbop\.com\/config\/v1\.json.*/, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            schemaVersion: 1,
            revision: 1,
            features: {
              editor: true,
              gif: true,
              video: true,
              boom: true,
              retakeOne: true,
              brandingControl: true,
            },
          }),
        }),
      );
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(`console.error: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => {
        errors.push(`pageerror: ${error.stack ?? error.message}`);
      });

      await use(errors);

      expect(errors, "application console and page errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function installRemoteConfig(
  page: Page,
  features: Record<string, boolean>,
): Promise<void> {
  await page.unroute(/https:\/\/boothbop\.com\/config\/v1\.json.*/);
  await page.route(/https:\/\/boothbop\.com\/config\/v1\.json.*/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ schemaVersion: 1, revision: 2, features }),
    }),
  );
}

export async function installDemoImages(page: Page): Promise<void> {
  await page.route(/\/demo\/set\d+-\d+\.jpg$/, async (route) => {
    const match = route
      .request()
      .url()
      .match(/set(\d+)-(\d+)\.jpg$/);
    const set = Number(match?.[1] ?? 1);
    const shot = Number(match?.[2] ?? 1);
    const hues = [18, 46, 174, 205, 338, 92];
    const hue = hues[(set * 2 + shot - 3) % hues.length];
    const body = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">',
      `<rect width="320" height="320" fill="hsl(${hue} 55% 70%)"/>`,
      `<circle cx="160" cy="130" r="78" fill="hsl(${hue} 40% 42%)"/>`,
      `<rect x="82" y="205" width="156" height="90" rx="38" fill="hsl(${hue} 45% 32%)"/>`,
      "</svg>",
    ].join("");

    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body,
    });
  });
}

export async function enableFileSharing(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        const state = window as typeof window & {
          __shareCalls?: number;
          __sharePayloads?: {
            files: { name: string; type: string; size: number }[];
          }[];
          __sharedFiles?: File[];
        };
        state.__shareCalls = (state.__shareCalls ?? 0) + 1;
        state.__sharePayloads ??= [];
        state.__sharePayloads.push({
          files: (data.files ?? []).map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        });
        state.__sharedFiles ??= [];
        state.__sharedFiles.push(...(data.files ?? []));
      },
    });
  });
}

export async function openDemoReview(page: Page): Promise<void> {
  await installDemoImages(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Demo 1" }).click();
  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    root: document.getElementById("root")?.scrollWidth ?? 0,
  }));

  expect(dimensions, "page must not scroll horizontally").toEqual({
    viewport: dimensions.viewport,
    document: dimensions.viewport,
    body: dimensions.viewport,
    root: dimensions.viewport,
  });
}

export async function expectFullyInViewport(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const result = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: window.innerHeight,
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
    };
  });

  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.left).toBeGreaterThanOrEqual(0);
  expect(result.bottom).toBeLessThanOrEqual(result.viewportHeight);
  expect(result.right).toBeLessThanOrEqual(result.viewportWidth);
}
