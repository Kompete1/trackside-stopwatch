import { createFeedbackAdapter } from "./feedback.js";
import { localStorageAdapter } from "./store.js";
import {
  applySettingsToState,
  buildSessionSummary,
  buildExportRows,
  createInitialAppState,
  createSystemTimeSource,
  hasAnyRunningDrivers,
  hasAnyTimingData,
  normalizeSettings,
  performAction,
  restoreAppState,
} from "./timing-engine.js";
import {
  populateSettingsForm,
  readSettingsForm,
  renderDataWindow,
  renderSessionSummary,
  setModeHeader,
  updateButtonStates,
  updateDataWindow,
  updateStatusBanner,
} from "./ui-render.js";

const TAP_GUARD_MS = 180;
const TICK_MS = 50;
const SAVE_HEARTBEAT_MS = 5000;

function getRequiredModeForIndex(index) {
  if (index <= 0) {
    return 1;
  }
  if (index === 1) {
    return 2;
  }
  return 4;
}

function nextMode(currentMode) {
  if (currentMode === 1) {
    return 2;
  }
  if (currentMode === 2) {
    return 4;
  }
  return 1;
}

function buildCsvContent(rows) {
  const maxSplits = rows.reduce((max, row) => Math.max(max, row.splitsMs.length), 0);
  const headers = ["Driver", "Lap", "Lap Time (ms)", "Recorded At"];
  for (let index = 0; index < maxSplits; index += 1) {
    headers.push(`Split ${index + 1} (ms)`);
  }

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const fields = [`"${row.label}"`, row.lapIndex, row.lapMs, row.recordedAtUnixMs || ""];
    for (let index = 0; index < maxSplits; index += 1) {
      fields.push(row.splitsMs[index] ?? "");
    }
    lines.push(fields.join(","));
  });

  return lines.join("\n");
}

function triggerCsvDownload(csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trackside-stopwatch-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 250);
}

export function startApp(documentRef = document) {
  const timeSource = createSystemTimeSource();
  let settings = normalizeSettings(localStorageAdapter.loadSettings());
  const storedSession = localStorageAdapter.loadSession();
  let state = createInitialAppState(settings);
  let renderedMode = null;
  let statusTimerId = null;
  const tapTimes = new Map();

  if (storedSession) {
    const restoredState = restoreAppState(storedSession, settings, timeSource);
    if (hasAnyTimingData(restoredState)) {
      const shouldResume =
        typeof window === "undefined" || typeof window.confirm !== "function"
          ? true
          : window.confirm("Resume your last timing session?");

      if (shouldResume) {
        state = restoredState;
      } else {
        localStorageAdapter.clearSession();
      }
    }
  }

  const modeHeader = documentRef.getElementById("mode-header");
  const statusBanner = documentRef.getElementById("status-banner");
  const dataWindow = documentRef.getElementById("data-window");
  const menuPopup = documentRef.getElementById("menu-popup");
  const settingsPopup = documentRef.getElementById("settings-popup");
  const summaryPopup = documentRef.getElementById("summary-popup");
  const userGuidePopup = documentRef.getElementById("user-guide-popup");
  const clickSound = documentRef.getElementById("click-sound");

  const lapButtons = [1, 2, 3, 4].map((index) => documentRef.getElementById(`lap${index}`));
  const splitButtons = [1, 2, 3, 4].map((index) => documentRef.getElementById(`split${index}`));
  const menuButton = documentRef.getElementById("menu-btn");
  const exportButton = documentRef.getElementById("ok-btn");

  const menuActions = {
    stopTiming: documentRef.getElementById("stop-timing"),
    resetTiming: documentRef.getElementById("reset-timing"),
    summary: documentRef.getElementById("open-summary"),
    settings: documentRef.getElementById("open-settings"),
    userGuide: documentRef.getElementById("user-guide"),
  };

  const summaryElements = {
    content: documentRef.getElementById("summary-content"),
    close: documentRef.getElementById("close-summary"),
  };

  const settingsForm = {
    sound: documentRef.getElementById("settings-sound"),
    haptics: documentRef.getElementById("settings-haptics"),
    wakeLock: documentRef.getElementById("settings-wake-lock"),
    accidentalTapGuard: documentRef.getElementById("settings-guard"),
    gloveMode: documentRef.getElementById("settings-glove-mode"),
    feedbackProfile: documentRef.getElementById("settings-profile"),
    preferredMode: documentRef.getElementById("settings-mode"),
    driverLabels: [1, 2, 3, 4].map((index) => documentRef.getElementById(`settings-driver-${index}`)),
    save: documentRef.getElementById("save-settings"),
    cancel: documentRef.getElementById("cancel-settings"),
  };

  const guideClose = documentRef.getElementById("close-user-guide");

  const feedback = createFeedbackAdapter({
    audioElement: clickSound,
    settings,
    onStatus: (message, tone) => {
      showStatus(message, tone);
    },
  });

  function showStatus(message, tone = "info", durationMs = 2200) {
    updateStatusBanner(statusBanner, message, tone);
    if (statusTimerId) {
      clearTimeout(statusTimerId);
    }
    if (!message) {
      return;
    }
    statusTimerId = setTimeout(() => {
      updateStatusBanner(statusBanner, "", tone);
      statusTimerId = null;
    }, durationMs);
  }

  function persistState() {
    localStorageAdapter.saveSession(state);
  }

  function syncWakeLock() {
    feedback.syncWakeLock(hasAnyRunningDrivers(state));
  }

  function syncUiModes() {
    const bodyRef = documentRef.body;
    if (!bodyRef) {
      return;
    }
    bodyRef.classList.toggle("glove-mode", settings.gloveModeEnabled);
  }

  function ensureLayout() {
    if (renderedMode === state.mode) {
      return;
    }

    renderDataWindow(dataWindow, state.mode);
    renderedMode = state.mode;
  }

  function render() {
    ensureLayout();
    setModeHeader(modeHeader, state.mode);
    updateButtonStates(lapButtons, splitButtons, state.mode);
    updateDataWindow(dataWindow, state, timeSource);
  }

  function applyAction(action, options = {}) {
    performAction(state, action, timeSource);
    render();
    persistState();
    syncWakeLock();

    if (options.statusMessage) {
      showStatus(options.statusMessage, options.statusTone || "info");
    }
  }

  function openOverlay(overlay) {
    overlay.hidden = false;
  }

  function closeOverlay(overlay) {
    overlay.hidden = true;
  }

  function canProcessTap(key) {
    const lastTap = tapTimes.get(key);
    const now = timeSource.nowUnixMs();
    if (settings.accidentalTapGuard && lastTap && now - lastTap < TAP_GUARD_MS) {
      return false;
    }
    tapTimes.set(key, now);
    return true;
  }

  function ensureModeForDriver(index) {
    const requiredMode = getRequiredModeForIndex(index);
    if (state.mode < requiredMode) {
      state.mode = requiredMode;
      render();
      persistState();
    }
  }

  function exportCurrentSession() {
    const rows = buildExportRows(state);
    if (!rows.length) {
      showStatus("No completed laps to export yet.", "warning");
      return;
    }

    triggerCsvDownload(buildCsvContent(rows));
    showStatus("CSV export downloaded.", "success");
  }

  function openSummary() {
    const summary = buildSessionSummary(state);
    renderSessionSummary(summaryElements.content, summary);
    closeOverlay(menuPopup);
    openOverlay(summaryPopup);
  }

  function tryCycleMode() {
    if (hasAnyRunningDrivers(state)) {
      showStatus("Pause timing before changing display mode.", "warning");
      return false;
    }

    feedback.playTap();
    state.mode = nextMode(state.mode);
    render();
    persistState();
    return true;
  }

  modeHeader.addEventListener("click", () => {
    tryCycleMode();
  });

  modeHeader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    tryCycleMode();
  });

  lapButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (!canProcessTap(`lap-${index}`)) {
        return;
      }

      ensureModeForDriver(index);
      const driver = state.drivers[index];
      const previousBest = driver.bestLapMs;
      const wasRunning = driver.status === "running";
      if (!wasRunning) {
        feedback.playTap();
      }
      applyAction({ type: "lapButton", driverId: index + 1 });
      if (wasRunning && driver.status === "running" && driver.lastLapMs != null) {
        feedback.playLap(previousBest == null || driver.lastLapMs < previousBest);
      }
    });
  });

  splitButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (!canProcessTap(`split-${index}`)) {
        return;
      }

      ensureModeForDriver(index);
      if (state.drivers[index].status === "running") {
        feedback.playTap();
      }
      applyAction({ type: "splitButton", driverId: index + 1 });
    });
  });

  menuButton.addEventListener("click", () => {
    feedback.playTap();
    openOverlay(menuPopup);
  });

  exportButton.addEventListener("click", () => {
    feedback.playTap();
    exportCurrentSession();
  });

  menuPopup.addEventListener("click", (event) => {
    if (event.target === menuPopup) {
      closeOverlay(menuPopup);
    }
  });

  settingsPopup.addEventListener("click", (event) => {
    if (event.target === settingsPopup) {
      closeOverlay(settingsPopup);
    }
  });

  summaryPopup.addEventListener("click", (event) => {
    if (event.target === summaryPopup) {
      closeOverlay(summaryPopup);
    }
  });

  userGuidePopup.addEventListener("click", (event) => {
    if (event.target === userGuidePopup) {
      closeOverlay(userGuidePopup);
    }
  });

  menuActions.stopTiming.addEventListener("click", () => {
    feedback.playTap();
    applyAction({ type: "stopAll" }, { statusMessage: "Timing paused." });
    closeOverlay(menuPopup);
  });

  menuActions.resetTiming.addEventListener("click", () => {
    feedback.playTap();
    const shouldReset =
      !hasAnyTimingData(state) ||
      typeof window === "undefined" ||
      typeof window.confirm !== "function" ||
      window.confirm("Reset all timing data?");
    if (!shouldReset) {
      return;
    }

    applyAction({ type: "resetAll" }, { statusMessage: "Timing reset." });
    closeOverlay(menuPopup);
  });

  menuActions.settings.addEventListener("click", () => {
    feedback.playTap();
    populateSettingsForm(settingsForm, settings);
    closeOverlay(menuPopup);
    openOverlay(settingsPopup);
  });

  menuActions.summary.addEventListener("click", () => {
    feedback.playTap();
    openSummary();
  });

  menuActions.userGuide.addEventListener("click", () => {
    feedback.playTap();
    closeOverlay(menuPopup);
    openOverlay(userGuidePopup);
  });

  settingsForm.cancel.addEventListener("click", () => {
    feedback.playTap();
    closeOverlay(settingsPopup);
  });

  settingsForm.save.addEventListener("click", () => {
    feedback.playTap();
    settings = normalizeSettings(readSettingsForm(settingsForm));
    localStorageAdapter.saveSettings(settings);
    feedback.setSettings(settings);
    if (!hasAnyRunningDrivers(state)) {
      state.mode = settings.preferredMode;
    }
    state.drivers.forEach((driver, index) => {
      driver.label = settings.driverLabels[index];
    });
    applySettingsToState(state, settings);
    syncUiModes();
    render();
    persistState();
    syncWakeLock();
    closeOverlay(settingsPopup);
    showStatus("Settings saved.", "success");
  });

  guideClose.addEventListener("click", () => {
    feedback.playTap();
    closeOverlay(userGuidePopup);
  });

  summaryElements.close.addEventListener("click", () => {
    feedback.playTap();
    closeOverlay(summaryPopup);
  });

  documentRef.addEventListener("visibilitychange", () => {
    persistState();
    feedback.handleVisibilityChange(hasAnyRunningDrivers(state));
  });

  window.addEventListener("beforeunload", () => {
    persistState();
  });

  setInterval(() => {
    if (!hasAnyRunningDrivers(state)) {
      return;
    }
    updateDataWindow(dataWindow, state, timeSource);
  }, TICK_MS);

  setInterval(() => {
    if (hasAnyRunningDrivers(state)) {
      persistState();
    }
  }, SAVE_HEARTBEAT_MS);

  render();
  persistState();
  syncWakeLock();
  syncUiModes();

  if (storedSession && hasAnyTimingData(state)) {
    showStatus("Previous session restored.", "success", 2800);
  }
}
