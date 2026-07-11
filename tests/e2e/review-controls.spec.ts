import { expect, installDemoImages, openDemoReview, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

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
});

test("GIF Boom toggle updates and persists", async ({ page }) => {
  await openDemoReview(page);
  await page.getByRole("tab", { name: "GIF" }).click();

  const boom = page.getByRole("switch");
  await expect(boom).toHaveAttribute("aria-checked", "false");
  await boom.click();
  await expect(boom).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("img", { name: "Your gif" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("bb.boom")))
    .toBe("1");
});

test("Retake One picker can enter and cancel a retake without losing review", async ({
  page,
}) => {
  await openDemoReview(page);
  await page.getByRole("button", { name: "Retake One" }).click();

  const picker = page.getByLabel("Choose a photo to retake");
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button")).toHaveCount(4);
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
