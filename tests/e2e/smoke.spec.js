import { expect, test } from "@playwright/test";

test("starts timing and keeps the UI responsive", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#mode-header")).toHaveText("1 Driver Mode");

  await page.getByRole("button", { name: "L1" }).click();
  await page.waitForTimeout(160);

  const timeText = await page.locator("#d1-time").textContent();
  expect(timeText).not.toBe("00:00.00");
});
