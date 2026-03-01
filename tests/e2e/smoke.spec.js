import { expect, test } from "@playwright/test";

async function acceptNextDialog(page) {
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
}

async function readShellLayout(page) {
  return page.evaluate(() => {
    const scrollingElement = document.scrollingElement || document.documentElement;
    const splitFour = document.getElementById("split4");
    const dataWindow = document.getElementById("data-window");
    const footer = document.querySelector(".button-grid");
    const menuButton = document.getElementById("menu-btn");
    const splitRect = splitFour?.getBoundingClientRect();
    const dataRect = dataWindow?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const menuRect = menuButton?.getBoundingClientRect();

    return {
      clientHeight: scrollingElement.clientHeight,
      scrollHeight: scrollingElement.scrollHeight,
      splitBottom: splitRect?.bottom ?? 0,
      dataBottom: dataRect?.bottom ?? 0,
      footerTop: footerRect?.top ?? 0,
      footerBottom: footerRect?.bottom ?? 0,
      menuTop: menuRect?.top ?? 0,
      menuRight: menuRect?.right ?? 0,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
}

async function readMenuActionOrder(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll(".sheet-menu button")).map((button) =>
      (button.textContent || "").trim()
    );
  });
}

async function readMetricLabelPositions(page, cardSelector) {
  return page.evaluate((targetSelector) => {
    return Array.from(document.querySelectorAll(`${targetSelector} .metric-label`)).map((element) => {
      const rect = element.getBoundingClientRect();
      const tileRect = element.closest(".metric-tile")?.getBoundingClientRect();
      return {
        text: (element.textContent || "").trim(),
        left: Math.round(rect.left - (tileRect?.left ?? 0)),
        top: Math.round(rect.top - (tileRect?.top ?? 0)),
      };
    });
  }, cardSelector);
}

async function readBoundsReport(page, selector) {
  return page.evaluate((targetSelector) => {
    return Array.from(document.querySelectorAll(targetSelector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((element, index) => {
        const container =
          element.closest(".metric-tile") ||
          element.closest(".driver-card-head") ||
          element.parentElement;
        const rect = element.getBoundingClientRect();
        const containerRect = container?.getBoundingClientRect();

        return {
          id: element.id || `${element.className || "node"}-${index}`,
          text: (element.textContent || "").trim(),
          outsideX:
            !containerRect ||
            rect.left < containerRect.left - 1 ||
            rect.right > containerRect.right + 1,
          outsideY:
            !containerRect ||
            rect.top < containerRect.top - 1 ||
            rect.bottom > containerRect.bottom + 1,
        };
      });
  }, selector);
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

    await page.fill("#settings-driver-1", "RACERKENT1");
    await page.selectOption("#settings-mode", "2");
    await page.locator("#settings-glove-mode").check();
    await page.locator("#save-settings").click();

    await expect(page.locator("#status-banner")).toContainText("Settings saved.");
    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");
    await expect(page.locator("#d1-label")).toHaveText("RACERKENT1");
    await expect(page.locator("body")).toHaveClass(/glove-mode/);

    await page.reload();

    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");
    await expect(page.locator("#d1-label")).toHaveText("RACERKENT1");
    await expect(page.locator("body")).toHaveClass(/glove-mode/);
  });

  test("export warns when there are no completed laps", async ({ page }) => {
    await page.goto("/");

    await page.locator("#menu-btn").click();
    await page.locator("#ok-btn").click();

    await expect(page.locator("#status-banner")).toContainText("No completed laps to export yet.");
  });

  test("shows hamburger actions in the required order", async ({ page }) => {
    await page.goto("/");

    await page.locator("#menu-btn").click();

    await expect(page.locator("#ok-btn")).not.toHaveClass(/amber/);
    await expect(await readMenuActionOrder(page)).toEqual([
      "Stop Timing",
      "Reset Timing",
      "Summary",
      "Export CSV",
      "Settings",
      "Help",
    ]);
  });

  test("shows a session summary with lap aggregates", async ({ page }) => {
    await page.goto("/");

    await page.locator("#lap1").click();
    await page.waitForTimeout(120);
    await page.locator("#split1").click();
    await page.waitForTimeout(120);
    await page.locator("#lap1").click();

    await page.locator("#menu-btn").click();
    await page.locator("#open-summary").click();

    await expect(page.locator("#summary-popup")).toBeVisible();
    await expect(page.locator("#summary-content")).toContainText("1 completed lap");
    await expect(page.locator("#summary-driver-1")).toContainText("Driver A");
    await expect(page.locator("#summary-driver-1")).toContainText("1 lap");
    await expect(page.locator("#summary-driver-1")).toContainText("Best Lap");
    await expect(page.locator("#summary-driver-1")).toContainText("Best Splits");
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

  test("keeps 2-driver metric labels fixed when timing values update", async ({ page }) => {
    await page.goto("/");

    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");

    const before = await readMetricLabelPositions(page, "#driver-card-1");

    await page.locator("#lap1").click();
    await page.waitForTimeout(140);
    await page.locator("#split1").click();
    await page.waitForTimeout(140);
    await page.locator("#lap1").click();

    const after = await readMetricLabelPositions(page, "#driver-card-1");

    expect(after).toHaveLength(before.length);
    before.forEach((label, index) => {
      expect(after[index].text).toBe(label.text);
      expect(after[index].left).toBe(label.left);
      expect(after[index].top).toBe(label.top);
    });
  });
});

test.describe("mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the fixed shell visible without page scroll in 4-driver mode", async ({ page }) => {
    await page.goto("/");

    await page.locator("#mode-header").click();
    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("4 Driver Mode");

    const layout = await readShellLayout(page);

    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
    expect(layout.splitBottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.dataBottom).toBeLessThanOrEqual(layout.footerTop + 1);
    expect(layout.footerBottom).toBeLessThanOrEqual(layout.viewportHeight);
    expect(layout.menuTop).toBeGreaterThanOrEqual(0);
    expect(layout.menuRight).toBeLessThanOrEqual(layout.viewportWidth);
  });

  test("keeps the lap and split footer locked in place across display modes", async ({ page }) => {
    await page.goto("/");

    const oneDriverLayout = await readShellLayout(page);

    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");
    const twoDriverLayout = await readShellLayout(page);

    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("4 Driver Mode");
    const fourDriverLayout = await readShellLayout(page);

    expect(twoDriverLayout.footerTop).toBeCloseTo(oneDriverLayout.footerTop, 0);
    expect(fourDriverLayout.footerTop).toBeCloseTo(oneDriverLayout.footerTop, 0);
    expect(twoDriverLayout.footerBottom).toBeCloseTo(oneDriverLayout.footerBottom, 0);
    expect(fourDriverLayout.footerBottom).toBeCloseTo(oneDriverLayout.footerBottom, 0);
  });

  test("keeps 2-driver metrics uncropped at the mobile baseline", async ({ page }) => {
    await page.goto("/");

    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("2 Driver Mode");

    const layout = await readShellLayout(page);
    const metrics = await readBoundsReport(
      page,
      "#driver-card-1 .driver-name, #driver-card-1 .driver-lap, #driver-card-1 .driver-time, #driver-card-1 .metric-value, #driver-card-1 .metric-sub, " +
        "#driver-card-2 .driver-name, #driver-card-2 .driver-lap, #driver-card-2 .driver-time, #driver-card-2 .metric-value, #driver-card-2 .metric-sub"
    );

    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
    expect(metrics.length).toBeGreaterThan(0);

    metrics.forEach((metric) => {
      expect(metric.outsideX, `${metric.id} ${metric.text}`).toBe(false);
      expect(metric.outsideY, `${metric.id} ${metric.text}`).toBe(false);
    });
  });

  test("keeps 4-driver timers and metrics uncropped at the mobile baseline", async ({ page }) => {
    await page.goto("/");

    await page.locator("#mode-header").click();
    await page.locator("#mode-header").click();
    await expect(page.locator("#mode-header")).toHaveText("4 Driver Mode");

    const layout = await readShellLayout(page);
    const timingNodes = await readBoundsReport(
      page,
      "#driver-card-1 .driver-time, #driver-card-1 .metric-value, #driver-card-1 .metric-sub, " +
        "#driver-card-2 .driver-time, #driver-card-2 .metric-value, #driver-card-2 .metric-sub, " +
        "#driver-card-3 .driver-time, #driver-card-3 .metric-value, #driver-card-3 .metric-sub, " +
        "#driver-card-4 .driver-time, #driver-card-4 .metric-value, #driver-card-4 .metric-sub"
    );

    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
    expect(timingNodes.length).toBeGreaterThan(0);

    timingNodes.forEach((node) => {
      expect(node.outsideX, `${node.id} ${node.text}`).toBe(false);
      expect(node.outsideY, `${node.id} ${node.text}`).toBe(false);
    });
  });
});
