import { enableFileSharing, expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

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
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __shareCalls?: number }).__shareCalls ??
          0,
      ),
    )
    .toBe(1);

  await page.getByRole("button", { name: "Retake One" }).click();
  await page.getByRole("button", { name: "Retake photo 2" }).click();
  await page.getByRole("button", { name: "Retake Photo 2" }).click();
  await expect(page.getByRole("img", { name: "Your strip" })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "My Photos" }).click();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(1);
});
