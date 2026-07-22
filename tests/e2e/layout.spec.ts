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
    await expectFullyInViewport(page.getByRole("button", { name: "Cancel" }));
    await expectFullyInViewport(
      page.getByRole("button", { name: "My Photos" }),
    );
    await expectFullyInViewport(page.getByRole("button", { name: "Settings" }));
    await expectNoHorizontalOverflow(page);
  });
});
