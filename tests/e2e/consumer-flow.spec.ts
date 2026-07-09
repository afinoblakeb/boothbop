import { expect, test } from "@playwright/test";

const viewports = [
  { name: "small", width: 320, height: 568 },
  { name: "standard", width: 390, height: 844 },
  { name: "large", width: 430, height: 932 },
] as const;

for (const viewport of viewports) {
  test(`home fits the ${viewport.name} phone viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Take Photo Strip" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Templates" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gallery" })).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath(`home-${viewport.name}.png`),
      fullPage: true,
    });
  });
}

test("demo shoot covers editing, rendering, download, and gallery", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Start Birthday demo shoot" }).click();
  await expect(page.getByText("Demo Camera")).toBeVisible();
  await page.getByRole("button", { name: "1s", exact: true }).click();
  await page.getByRole("button", { name: "Run Demo Shoot" }).click();

  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible({
    timeout: 30_000,
  });
  const preview = page.getByAltText("Your strip");
  await expect(preview).toBeVisible();
  const originalPreview = await preview.getAttribute("src");
  expect(originalPreview).toMatch(/^data:image\/png/);

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByText("Edit", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Studio Glam" }).click();
  await expect
    .poll(() => preview.getAttribute("src"))
    .not.toBe(originalPreview);

  await page.getByRole("button", { name: "Layout", exact: true }).click();
  await page.getByRole("button", { name: "Grid", exact: true }).click();

  await page.getByRole("button", { name: "Props", exact: true }).click();
  await page.getByRole("button", { name: "Star Shades" }).click();

  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByPlaceholder("BoothBop").fill("Best Day");

  await page.getByRole("button", { name: "Shots", exact: true }).click();
  await page.getByRole("button", { name: "Move shot 1 later" }).click();

  await page.screenshot({
    path: testInfo.outputPath("editor.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Save All" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^boothbop-.+\.png$/);

  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: "Gallery" }).click();
  await expect(
    page.getByRole("heading", { name: "BoothBop Gallery" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sample: Birthday" }),
  ).toBeVisible();
});
