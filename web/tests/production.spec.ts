import { expect, test } from "@playwright/test";

test("production routes render without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const route of ["/", "/connect", "/login?lang=th", "/profile"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  }

  await page.goto("/install");
  await expect(page).toHaveURL(/\/connect$/);
  expect(errors).toEqual([]);
});
