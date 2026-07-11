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

    test("home and collapsed review have no horizontal overflow", async ({
      page,
    }) => {
      await enableFileSharing(page);
      await page.goto("/");
      await expect(page.getByRole("img", { name: "BoothBop" })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await openDemoReview(page);
      await expect(page.getByRole("button", { name: "Style" })).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Style" })).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await expectFullyInViewport(
        page.getByRole("button", { name: "Save / Share" }),
      );
    });
  });
}
