import { getDriverElapsedMs, getVisibleDriverCount } from "./timing-engine.js";

function createElement(doc, tagName, { className = "", id = "", text = "" } = {}) {
  const element = doc.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (id) {
    element.id = id;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function createMetricTile(doc, { label, labelId = "", valueId, valueText, valueClass = "", tileClass = "", subId = "", subText = "", subClass = "" }) {
  const tile = createElement(doc, "div", {
    className: tileClass ? `metric-tile ${tileClass}` : "metric-tile",
  });
  const main = createElement(doc, "div", { className: "metric-main" });
  const labelEl = createElement(doc, "span", {
    className: "metric-label",
    id: labelId,
    text: label,
  });
  const valueEl = createElement(doc, "span", {
    className: valueClass ? `metric-value ${valueClass}` : "metric-value",
    id: valueId,
    text: valueText,
  });

  main.append(labelEl, valueEl);
  tile.appendChild(main);

  if (subId || subText) {
    const subEl = createElement(doc, "span", {
      className: subClass ? `metric-sub ${subClass}` : "metric-sub",
      id: subId,
      text: subText,
    });
    tile.appendChild(subEl);
  }

  return tile;
}

function buildDriverCard(doc, driverIndex, compact = false, solo = false) {
  const prefix = `d${driverIndex}`;
  const card = createElement(doc, "section", {
    className: `driver-card${compact ? " compact" : ""}${solo ? " solo" : ""}`,
    id: `driver-card-${driverIndex}`,
  });

  const head = createElement(doc, "div", { className: "driver-card-head" });
  const name = createElement(doc, "span", {
    className: "driver-name",
    id: `${prefix}-label`,
    text: `Driver ${driverIndex}`,
  });
  const time = createElement(doc, "div", {
    className: "driver-time",
    id: `${prefix}-time`,
    text: "00:00.00",
  });
  const lap = createElement(doc, "span", {
    className: "driver-lap",
    id: `${prefix}-lap`,
    text: "Lap #1",
  });

  head.append(name, time, lap);

  const metricGrid = createElement(doc, "div", { className: "metric-grid" });
  metricGrid.append(
    createMetricTile(doc, {
      label: "Last",
      valueId: `${prefix}-last`,
      valueText: "--:--.--",
    }),
    createMetricTile(doc, {
      label: "Diff",
      valueId: `${prefix}-diff`,
      valueText: "+00.00",
    }),
    createMetricTile(doc, {
      label: "Best",
      valueId: `${prefix}-best`,
      valueText: "--:--.--",
      valueClass: "best-lap-value",
    }),
    createMetricTile(doc, {
      label: "Split 0",
      labelId: `${prefix}-split-label`,
      valueId: `${prefix}-split`,
      valueText: "--.--",
      tileClass: "metric-split-tile",
      subId: `${prefix}-best-split`,
      subText: "Best --.--",
      subClass: "best-split-value",
    })
  );

  card.append(head, metricGrid);
  return card;
}

export function renderDataWindow(container, mode) {
  const doc = container.ownerDocument;
  const visibleDrivers = getVisibleDriverCount(mode);
  container.classList.remove("mode-1", "mode-2", "mode-4");
  container.classList.add(`mode-${visibleDrivers}`);

  if (visibleDrivers === 1) {
    const stack = createElement(doc, "div", { className: "driver-stack solo-stack" });
    stack.appendChild(buildDriverCard(doc, 1, false, true));
    container.replaceChildren(stack);
    return;
  }

  if (visibleDrivers === 2) {
    const stack = createElement(doc, "div", { className: "driver-stack dual-stack" });
    stack.append(buildDriverCard(doc, 1), buildDriverCard(doc, 2));
    container.replaceChildren(stack);
    return;
  }

  const grid = createElement(doc, "div", { className: "driver-grid four-up" });
  grid.append(
    buildDriverCard(doc, 1, true),
    buildDriverCard(doc, 2, true),
    buildDriverCard(doc, 3, true),
    buildDriverCard(doc, 4, true)
  );
  container.replaceChildren(grid);
}

export function formatClock(ms) {
  if (!Number.isFinite(ms)) {
    return "--:--.--";
  }

  const safeMs = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safeMs / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(
    centiseconds
  ).padStart(2, "0")}`;
}

export function formatSplit(ms) {
  if (!Number.isFinite(ms)) {
    return "--.--";
  }

  if (ms >= 60000) {
    return formatClock(ms);
  }

  return (ms / 1000).toFixed(2);
}

export function formatDiff(lastLapMs, bestLapMs) {
  if (!Number.isFinite(lastLapMs) || !Number.isFinite(bestLapMs)) {
    return "+00.00";
  }

  const diff = lastLapMs - bestLapMs;
  const sign = diff >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(diff) / 1000).toFixed(2)}`;
}

function clearBestHighlights() {
  document.querySelectorAll(".best-lap-value").forEach((element) => {
    element.classList.remove("session-best-lap");
  });
  document.querySelectorAll(".best-split-value").forEach((element) => {
    element.classList.remove("session-best-split");
  });
}

function applyLastLapTrendClass(element, trend) {
  if (!element) {
    return;
  }

  element.classList.remove("last-lap-fast", "last-lap-slow");
  if (trend === "faster") {
    element.classList.add("last-lap-fast");
  } else if (trend === "slower") {
    element.classList.add("last-lap-slow");
  }
}

export function setModeHeader(modeHeader, mode) {
  modeHeader.textContent = `${mode} Driver Mode`;
  modeHeader.setAttribute("aria-label", `${mode} driver mode`);
}

export function updateButtonStates(lapButtons, splitButtons, mode) {
  const visibleDrivers = getVisibleDriverCount(mode);

  for (let index = 0; index < lapButtons.length; index += 1) {
    const lapButton = lapButtons[index];
    const splitButton = splitButtons[index];
    const active = index < visibleDrivers;
    lapButton.classList.toggle("inactive", !active);
    splitButton.classList.toggle("inactive", !active);
  }
}

export function populateSettingsForm(formElements, settings) {
  formElements.sound.checked = settings.soundEnabled;
  formElements.haptics.checked = settings.hapticsEnabled;
  formElements.wakeLock.checked = settings.wakeLockEnabled;
  formElements.accidentalTapGuard.checked = settings.accidentalTapGuard;
  formElements.gloveMode.checked = settings.gloveModeEnabled;
  formElements.feedbackProfile.value = settings.feedbackProfile;
  formElements.preferredMode.value = String(settings.preferredMode);
  formElements.driverLabels.forEach((input, index) => {
    input.value = settings.driverLabels[index] || "";
  });
}

export function readSettingsForm(formElements) {
  return {
    soundEnabled: formElements.sound.checked,
    hapticsEnabled: formElements.haptics.checked,
    wakeLockEnabled: formElements.wakeLock.checked,
    accidentalTapGuard: formElements.accidentalTapGuard.checked,
    gloveModeEnabled: formElements.gloveMode.checked,
    feedbackProfile: formElements.feedbackProfile.value,
    preferredMode: Number(formElements.preferredMode.value),
    driverLabels: formElements.driverLabels.map((input) => input.value),
  };
}

export function updateStatusBanner(statusBanner, message, tone = "info") {
  if (!message) {
    statusBanner.hidden = true;
    statusBanner.textContent = "";
    statusBanner.dataset.tone = "";
    return;
  }

  statusBanner.hidden = false;
  statusBanner.textContent = message;
  statusBanner.dataset.tone = tone;
}

function formatBestSplitSummary(bestSplitsMs) {
  if (!Array.isArray(bestSplitsMs) || !bestSplitsMs.length) {
    return "No splits yet";
  }

  return bestSplitsMs
    .map((splitMs, index) => `S${index + 1} ${formatSplit(splitMs)}`)
    .join(" | ");
}

export function renderSessionSummary(container, summary) {
  const doc = container.ownerDocument;
  const totalLabel = summary.totalCompletedLaps === 1 ? "1 completed lap" : `${summary.totalCompletedLaps} completed laps`;
  const topline = createElement(doc, "div", {
    className: "summary-topline",
    text: totalLabel,
  });
  const grid = createElement(doc, "div", { className: "summary-grid" });

  summary.drivers.forEach((driver) => {
    const card = createElement(doc, "section", {
      className: "summary-card",
      id: `summary-driver-${driver.driverId}`,
    });
    const head = createElement(doc, "div", { className: "summary-card-head" });
    head.append(
      createElement(doc, "span", {
        className: "summary-driver-name",
        text: `Driver ${driver.label}`,
      }),
      createElement(doc, "span", {
        className: "summary-lap-count",
        text: `${driver.completedLaps} lap${driver.completedLaps === 1 ? "" : "s"}`,
      })
    );

    const metrics = createElement(doc, "div", { className: "summary-metrics" });
    [
      ["Best Lap", formatClock(driver.bestLapMs)],
      ["Last Lap", formatClock(driver.lastLapMs)],
    ].forEach(([label, value]) => {
      const row = createElement(doc, "div", { className: "summary-metric-row" });
      row.append(
        createElement(doc, "span", { className: "summary-label", text: label }),
        createElement(doc, "span", { className: "summary-value", text: value })
      );
      metrics.appendChild(row);
    });

    const splits = createElement(doc, "div", { className: "summary-splits" });
    splits.append(
      createElement(doc, "span", { className: "summary-label", text: "Best Splits" }),
      createElement(doc, "span", {
        className: "summary-split-list",
        text: formatBestSplitSummary(driver.bestSplitsMs),
      })
    );

    card.append(head, metrics, splits);
    grid.appendChild(card);
  });

  container.replaceChildren(topline, grid);
}

export function updateDataWindow(container, state, timeSource) {
  const visibleDrivers = getVisibleDriverCount(state.mode);
  const activeDrivers = state.drivers.slice(0, visibleDrivers);
  const sessionBestDriver = activeDrivers.reduce(
    (best, driver) => {
      if (!Number.isFinite(driver.bestLapMs)) {
        return best;
      }

      if (!best || driver.bestLapMs < best.bestLapMs) {
        return { driverId: driver.driverId, bestLapMs: driver.bestLapMs };
      }

      return best;
    },
    null
  );
  const sessionBestSplitDriver = activeDrivers.reduce((best, driver) => {
    if (driver.lastSplitPosition <= 0) {
      return best;
    }

    const displayedBestSplit = driver.bestSplitsMs[driver.lastSplitPosition - 1];
    if (!Number.isFinite(displayedBestSplit)) {
      return best;
    }

    if (!best || displayedBestSplit < best.bestSplitMs) {
      return { driverId: driver.driverId, bestSplitMs: displayedBestSplit };
    }

    return best;
  }, null);

  clearBestHighlights();

  for (let index = 0; index < visibleDrivers; index += 1) {
    const driver = state.drivers[index];
    const driverId = driver.driverId;
    const prefix = `d${driverId}`;
    const card = document.getElementById(`driver-card-${driverId}`);
    if (!card) {
      continue;
    }

    const elapsedMs = getDriverElapsedMs(driver, timeSource);
    const bestSplitForPosition =
      driver.lastSplitPosition > 0 ? driver.bestSplitsMs[driver.lastSplitPosition - 1] : null;

    card.classList.toggle("running", driver.status === "running");
    card.classList.toggle("paused", driver.status === "paused");

    const nameEl = document.getElementById(`${prefix}-label`);
    const lapEl = document.getElementById(`${prefix}-lap`);
    const timeEl = document.getElementById(`${prefix}-time`);
    const lastEl = document.getElementById(`${prefix}-last`);
    const diffEl = document.getElementById(`${prefix}-diff`);
    const bestEl = document.getElementById(`${prefix}-best`);
    const splitLabelEl = document.getElementById(`${prefix}-split-label`);
    const splitEl = document.getElementById(`${prefix}-split`);
    const bestSplitEl = document.getElementById(`${prefix}-best-split`);
    const compactMode = visibleDrivers === 4;

    if (nameEl) {
      nameEl.textContent = compactMode ? driver.label : `Driver ${driver.label}`;
    }
    if (lapEl) {
      if (compactMode) {
        lapEl.textContent = driver.status === "paused" ? `L#${driver.lapIndex} P` : `L#${driver.lapIndex}`;
      } else {
        lapEl.textContent =
          driver.status === "paused" ? `Lap #${driver.lapIndex} Paused` : `Lap #${driver.lapIndex}`;
      }
    }
    if (timeEl) {
      timeEl.textContent = formatClock(elapsedMs);
    }
    if (lastEl) {
      lastEl.textContent = formatClock(driver.lastLapMs);
      applyLastLapTrendClass(lastEl, driver.lastLapTrend);
    }
    if (diffEl) {
      diffEl.textContent = formatDiff(driver.lastLapMs, driver.bestLapMs);
    }
    if (bestEl) {
      bestEl.textContent = formatClock(driver.bestLapMs);
      if (sessionBestDriver && sessionBestDriver.driverId === driver.driverId) {
        bestEl.classList.add("session-best-lap");
      }
    }
    if (splitLabelEl) {
      if (compactMode) {
        splitLabelEl.textContent = driver.lastSplitPosition > 0 ? `S${driver.lastSplitPosition}` : "S0";
      } else {
        splitLabelEl.textContent =
          driver.lastSplitPosition > 0 ? `Split ${driver.lastSplitPosition}` : "Split 0";
      }
    }
    if (splitEl) {
      splitEl.textContent = formatSplit(driver.lastSplitMs);
    }
    if (bestSplitEl) {
      bestSplitEl.textContent = `Best ${formatSplit(bestSplitForPosition)}`;
      if (sessionBestSplitDriver && sessionBestSplitDriver.driverId === driver.driverId && bestSplitForPosition != null) {
        bestSplitEl.classList.add("session-best-split");
      }
    }
  }

  for (let hiddenIndex = visibleDrivers + 1; hiddenIndex <= 4; hiddenIndex += 1) {
    const card = container.querySelector(`#driver-card-${hiddenIndex}`);
    if (card) {
      card.remove();
    }
  }
}
