import { expect, test } from "@playwright/test";

async function acceptNextDialog(page) {
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
}

test.describe("trackside stopwatch flows", () => {
  test("records split and lap updates for a running driver", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#mode-header")).toHaveText("1 Driver Mode");

    await page.locator("#lap1").click();
    await page.waitForTimeout(140);
    await page.locator("#split1").click();

    await expect(page.locator("#d1-split-label")).toHaveText("Split 1");
    await expect(page.locator("#d1-split")).not.toHaveText("--.--");

    await page.waitForTimeout(140);
    await page.locator("#lap1").click();

    await expect(page.locator("#d1-lap")).toHaveText("Lap #2");
    await expect(page.locator("#d1-best")).not.toHaveText("--:--.--");
  });

  test("restores an active session after reload", async ({ page }) => {
    await page.goto("/");

    await page.locator("#lap1").click();
    await page.waitForTimeout(180);
    const beforeReload = await page.locator("#d1-time").textContent();

    await acceptNextDialog(page);
    await page.reload();

    await expect(page.locator("#d1-time")).not.toHaveText("00:00.00");
    await expect(page.locator("#d1-time")).not.toHaveText(beforeReload ?? "00:00.00");
    await expect(page.locator("#d1-lap")).toHaveText("Lap #1");
  });

  test("reset confirmation clears timing state", async ({ page }) => {
    await page.goto("/");

    await page.locator("#lap1").click();
    await page.waitForTimeout(120);
    await page.locator("#menu-btn").click();

    await acceptNextDialog(page);
    await page.locator("#reset-timing").click();

    await expect(page.locator("#status-banner")).toContainText("Timing reset.");
    await expect(page.locator("#d1-time")).toHaveText("00:00.00");
    await expect(page.locator("#d1-lap")).toHaveText("Lap #1");
    await expect(page.locator("#d1-best")).toHaveText("--:--.--");
  });

  test("settings changes persist after reload", async ({ page }) => {
    await page.goto("/");

    await page.locator("#menu-btn").click();
    await page.locator("#open-settings").click();

    await page.fill("#settings-driver-1", "ZX");
    await page.selectOption("#settings-mode", "2");
    await page.locator("#save-settings").click();

    await expect(page.locator("#status-banner")).toContainText("Settings saved.");
    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");
    await expect(page.locator("#d1-label")).toHaveText("Driver ZX");

    await page.reload();

    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");
    await expect(page.locator("#d1-label")).toHaveText("Driver ZX");
  });

  test("export warns when there are no completed laps", async ({ page }) => {
    await page.goto("/");

    await page.locator("#ok-btn").click();

    await expect(page.locator("#status-banner")).toContainText("No completed laps to export yet.");
  });

  test("blocks mode switching while timing is active", async ({ page }) => {
    await page.goto("/");

    await page.locator("#lap1").click();
    await page.waitForTimeout(120);
    await page.locator("#mode-header").click();

    await expect(page.locator("#mode-header")).toHaveText("1 Driver Mode");
    await expect(page.locator("#status-banner")).toContainText("Pause timing before changing display mode.");
  });

  test("allows mode switching after timing is paused", async ({ page }) => {
    await page.goto("/");

    await page.locator("#lap1").click();
    await page.waitForTimeout(120);
    await page.locator("#menu-btn").click();
    await page.locator("#stop-timing").click();

    await expect(page.locator("#status-banner")).toContainText("Timing paused.");

    await page.locator("#mode-header").click();

    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");
  });
});

test.describe("mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the button grid visible without page scroll in 4-driver mode", async ({ page }) => {
    await page.goto("/");

    await page.locator("#mode-header").click();
    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("4 Driver Mode");

    const layout = await page.evaluate(() => {
      const scrollingElement = document.scrollingElement || document.documentElement;
      const menuButton = document.getElementById("menu-btn");
      const exportButton = document.getElementById("ok-btn");
      const menuRect = menuButton?.getBoundingClientRect();
      const exportRect = exportButton?.getBoundingClientRect();

      return {
        clientHeight: scrollingElement.clientHeight,
        scrollHeight: scrollingElement.scrollHeight,
        menuBottom: menuRect?.bottom ?? 0,
        exportBottom: exportRect?.bottom ?? 0,
        viewportHeight: window.innerHeight,
      };
    });

    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
    expect(layout.menuBottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.exportBottom).toBeLessThanOrEqual(layout.viewportHeight);
  });
});
