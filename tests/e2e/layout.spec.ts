import {
  enableFileSharing,
  expect,
  expectFullyInViewport,
  expectNoHorizontalOverflow,
  openDemoReview,
  test,
} from "./fixtures";

const phones = [
  { name: "compact", width: 320, height: 568 },
  { name: "standard", width: 390, height: 844 },
  { name: "large", width: 430, height: 932 },
] as const;

test("the modern app canvas uses a genuinely transparent wordmark", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(244, 245, 245)",
  );
  const navigation = page.locator("header").first();
  await expect(navigation).toHaveCSS("background-color", "rgb(244, 245, 245)");
  await expect(navigation).toHaveCSS("border-bottom-width", "0px");
  const cornerAlpha = await page.getByAltText("BoothBop").evaluate((image) => {
    const logo = image as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = logo.naturalWidth;
    canvas.height = logo.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing logo canvas context");
    context.drawImage(logo, 0, 0);
    return context.getImageData(0, 0, 1, 1).data[3];
  });
  expect(cornerAlpha).toBe(0);
});

for (const phone of phones) {
  test.describe(`${phone.name} phone`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height } });

    test("home, review, and editor fit without overflow", async ({ page }) => {
      await enableFileSharing(page);
      await page.goto("/");
      await expect(page.getByRole("img", { name: "BoothBop" })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await openDemoReview(page);
      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
      await expect(
        page.getByRole("dialog", { name: "Edit photos" }),
      ).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await expectFullyInViewport(
        page.getByRole("button", { name: "Share Photo" }),
      );

      await page.getByRole("button", { name: "Edit" }).click();
      const editor = page.getByRole("dialog", { name: "Edit photos" });
      await expect(editor).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectFullyInViewport(
        editor.getByRole("img", { name: "Editing strip" }),
      );
      await expectFullyInViewport(editor.getByRole("button", { name: "Done" }));
      for (const tool of ["Look", "Layout", "Colors"]) {
        await expectFullyInViewport(editor.getByRole("button", { name: tool }));
      }

      const previewHeight = await editor
        .getByRole("img", { name: "Editing strip" })
        .evaluate((image) => image.getBoundingClientRect().height);
      expect(previewHeight).toBeGreaterThan(180);
    });
  });
}

test.describe("compact camera", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("preview and every capture control stay usable without scrolling", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Take Photos" }).click();

    await expectFullyInViewport(page.locator("video"));
    await expectFullyInViewport(
      page.getByRole("group", { name: "Countdown seconds" }),
    );
    await expectFullyInViewport(
      page.getByRole("button", { name: "Take Photos" }),
    );
    const countdownLabel = page.getByText("Countdown", { exact: true });
    const delaySwitch = page.getByRole("group", {
      name: "Countdown seconds",
    });
    const [labelBounds, switchBounds] = await Promise.all([
      countdownLabel.boundingBox(),
      delaySwitch.boundingBox(),
    ]);
    expect(labelBounds).not.toBeNull();
    expect(switchBounds).not.toBeNull();
    expect(labelBounds!.y + labelBounds!.height).toBeLessThanOrEqual(
      switchBounds!.y,
    );
    expect(
      Math.abs(
        labelBounds!.x +
          labelBounds!.width / 2 -
          (switchBounds!.x + switchBounds!.width / 2),
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(switchBounds!.x + switchBounds!.width / 2 - 320 / 2),
    ).toBeLessThanOrEqual(1);
    await expectFullyInViewport(page.getByRole("button", { name: "Cancel" }));
    await expectFullyInViewport(
      page.getByRole("button", { name: "My Photos" }),
    );
    await expectFullyInViewport(page.getByRole("button", { name: "Settings" }));
    await page.getByRole("button", { name: "My Photos" }).click();
    await expect(page.getByRole("dialog", { name: "My Photos" })).toBeVisible();
    await page.getByRole("button", { name: "Camera" }).click();
    await expect(page.locator("video")).toBeVisible();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("video")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("5.5-inch camera", () => {
  test.use({ viewport: { width: 414, height: 736 } });

  test("the complete shutter control stays on screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Take Photos" }).click();

    await expectFullyInViewport(page.locator("video"));
    await expectFullyInViewport(
      page.getByRole("group", { name: "Countdown seconds" }),
    );
    await expectFullyInViewport(
      page.getByText("Take Photos", { exact: true }).last(),
    );
  });
});
