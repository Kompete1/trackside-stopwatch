import { getDriverElapsedMs, getVisibleDriverCount } from "./timing-engine.js";

function buildDriverCard(driverIndex, compact = false, solo = false) {
  const prefix = `d${driverIndex}`;
  const classes = ["driver-card"];
  if (compact) {
    classes.push("compact");
  }
  if (solo) {
    classes.push("solo");
  }

  return `
    <section class="${classes.join(" ")}" id="driver-card-${driverIndex}">
      <div class="driver-card-head">
        <span class="driver-name" id="${prefix}-label">Driver ${driverIndex}</span>
        <div class="driver-time" id="${prefix}-time">00:00.00</div>
        <span class="driver-lap" id="${prefix}-lap">Lap #1</span>
      </div>
      <div class="metric-grid">
        <div class="metric-tile">
          <div class="metric-main">
            <span class="metric-label">Last</span>
            <span class="metric-value" id="${prefix}-last">--:--.--</span>
          </div>
        </div>
        <div class="metric-tile">
          <div class="metric-main">
            <span class="metric-label">Diff</span>
            <span class="metric-value" id="${prefix}-diff">+00.00</span>
          </div>
        </div>
        <div class="metric-tile">
          <div class="metric-main">
            <span class="metric-label">Best</span>
            <span class="metric-value best-lap-value" id="${prefix}-best">--:--.--</span>
          </div>
        </div>
        <div class="metric-tile metric-split-tile">
          <div class="metric-main">
            <span class="metric-label" id="${prefix}-split-label">Split 0</span>
            <span class="metric-value" id="${prefix}-split">--.--</span>
          </div>
          <span class="metric-sub best-split-value" id="${prefix}-best-split">Best --.--</span>
        </div>
      </div>
    </section>
  `;
}

export function renderDataWindow(container, mode) {
  const visibleDrivers = getVisibleDriverCount(mode);
  container.classList.remove("mode-1", "mode-2", "mode-4");
  container.classList.add(`mode-${visibleDrivers}`);

  if (visibleDrivers === 1) {
    container.innerHTML = `<div class="driver-stack solo-stack">${buildDriverCard(1, false, true)}</div>`;
    return;
  }

  if (visibleDrivers === 2) {
    container.innerHTML = `
      <div class="driver-stack dual-stack">
        ${buildDriverCard(1)}
        ${buildDriverCard(2)}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="driver-grid four-up">
      ${buildDriverCard(1, true)}
      ${buildDriverCard(2, true)}
      ${buildDriverCard(3, true)}
      ${buildDriverCard(4, true)}
    </div>
  `;
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
  const totalLabel = summary.totalCompletedLaps === 1 ? "1 completed lap" : `${summary.totalCompletedLaps} completed laps`;
  const cardsMarkup = summary.drivers
    .map(
      (driver) => `
        <section class="summary-card" id="summary-driver-${driver.driverId}">
          <div class="summary-card-head">
            <span class="summary-driver-name">Driver ${driver.label}</span>
            <span class="summary-lap-count">${driver.completedLaps} lap${driver.completedLaps === 1 ? "" : "s"}</span>
          </div>
          <div class="summary-metrics">
            <div class="summary-metric-row">
              <span class="summary-label">Best Lap</span>
              <span class="summary-value">${formatClock(driver.bestLapMs)}</span>
            </div>
            <div class="summary-metric-row">
              <span class="summary-label">Last Lap</span>
              <span class="summary-value">${formatClock(driver.lastLapMs)}</span>
            </div>
          </div>
          <div class="summary-splits">
            <span class="summary-label">Best Splits</span>
            <span class="summary-split-list">${formatBestSplitSummary(driver.bestSplitsMs)}</span>
          </div>
        </section>
      `
    )
    .join("");

  container.innerHTML = `
    <div class="summary-topline">${totalLabel}</div>
    <div class="summary-grid">${cardsMarkup}</div>
  `;
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
