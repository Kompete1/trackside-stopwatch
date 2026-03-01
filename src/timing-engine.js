export const APP_STATE_VERSION = 2;
export const MODES = [1, 2, 4];
export const MAX_DRIVERS = 4;
const MAX_EVENT_LOG = 500;

const DEFAULT_LABELS = ["A", "B", "C", "D"];

function fallbackMonoNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function createSystemTimeSource() {
  return {
    nowUnixMs: () => Date.now(),
    nowMonoMs: () => fallbackMonoNow(),
  };
}

export function normalizeMode(value) {
  return MODES.includes(value) ? value : 1;
}

export function sanitizeDriverLabel(label, fallback = "DRV") {
  const cleaned = String(label ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .slice(0, 4);
  return cleaned || fallback;
}

export function normalizeSettings(input = {}) {
  const fallbackLabels = Array.isArray(input.driverLabels) ? input.driverLabels : DEFAULT_LABELS;
  const driverLabels = DEFAULT_LABELS.map((defaultLabel, index) =>
    sanitizeDriverLabel(fallbackLabels[index], defaultLabel)
  );

  const feedbackProfile = ["off", "light", "strong"].includes(input.feedbackProfile)
    ? input.feedbackProfile
    : "light";

  return {
    soundEnabled: input.soundEnabled !== false,
    hapticsEnabled: input.hapticsEnabled !== false,
    feedbackProfile,
    wakeLockEnabled: input.wakeLockEnabled !== false,
    preferredMode: normalizeMode(input.preferredMode || 1),
    accidentalTapGuard: input.accidentalTapGuard !== false,
    theme: "motorsport",
    driverLabels,
  };
}

export function getVisibleDriverCount(mode) {
  return normalizeMode(mode);
}

export function createDriverState(driverId, label) {
  return {
    driverId,
    label,
    status: "idle",
    lapIndex: 1,
    currentLapElapsedMs: 0,
    lapStartedAtUnixMs: null,
    runningSinceUnixMs: null,
    runningSinceMonoMs: null,
    lastLapMs: null,
    bestLapMs: null,
    bestLapLapIndex: null,
    lastLapTrend: null,
    splitCount: 0,
    lastSplitMs: null,
    lastSplitPosition: 0,
    bestSplitsMs: [],
    currentLapSplitMarkersMs: [],
    currentLapSplitsMs: [],
    lastSplitsMs: [],
    lapHistory: [],
  };
}

export function createInitialAppState(settings = normalizeSettings()) {
  const timeSource = createSystemTimeSource();
  return {
    version: APP_STATE_VERSION,
    mode: settings.preferredMode,
    isActive: false,
    createdAt: timeSource.nowUnixMs(),
    updatedAt: timeSource.nowUnixMs(),
    nextEventId: 1,
    eventLog: [],
    drivers: DEFAULT_LABELS.map((defaultLabel, index) =>
      createDriverState(index + 1, settings.driverLabels[index] || defaultLabel)
    ),
  };
}

function hydrateDriver(savedDriver, index, settings) {
  const fallbackLabel = settings.driverLabels[index] || DEFAULT_LABELS[index];
  const driver = createDriverState(index + 1, fallbackLabel);
  if (!savedDriver || typeof savedDriver !== "object") {
    return driver;
  }

  driver.label = sanitizeDriverLabel(savedDriver.label, fallbackLabel);
  driver.status = ["idle", "running", "paused"].includes(savedDriver.status) ? savedDriver.status : "idle";
  driver.lapIndex = Number.isFinite(savedDriver.lapIndex) && savedDriver.lapIndex > 0 ? savedDriver.lapIndex : 1;
  driver.currentLapElapsedMs =
    Number.isFinite(savedDriver.currentLapElapsedMs) && savedDriver.currentLapElapsedMs >= 0
      ? savedDriver.currentLapElapsedMs
      : 0;
  driver.lapStartedAtUnixMs =
    Number.isFinite(savedDriver.lapStartedAtUnixMs) && savedDriver.lapStartedAtUnixMs > 0
      ? savedDriver.lapStartedAtUnixMs
      : null;
  driver.runningSinceUnixMs =
    Number.isFinite(savedDriver.runningSinceUnixMs) && savedDriver.runningSinceUnixMs > 0
      ? savedDriver.runningSinceUnixMs
      : null;
  driver.lastLapMs = Number.isFinite(savedDriver.lastLapMs) ? savedDriver.lastLapMs : null;
  driver.bestLapMs = Number.isFinite(savedDriver.bestLapMs) ? savedDriver.bestLapMs : null;
  driver.bestLapLapIndex =
    Number.isFinite(savedDriver.bestLapLapIndex) && savedDriver.bestLapLapIndex > 0
      ? savedDriver.bestLapLapIndex
      : null;
  driver.lastLapTrend = ["faster", "slower"].includes(savedDriver.lastLapTrend) ? savedDriver.lastLapTrend : null;
  driver.splitCount =
    Number.isFinite(savedDriver.splitCount) && savedDriver.splitCount >= 0 ? savedDriver.splitCount : 0;
  driver.lastSplitMs = Number.isFinite(savedDriver.lastSplitMs) ? savedDriver.lastSplitMs : null;
  driver.lastSplitPosition =
    Number.isFinite(savedDriver.lastSplitPosition) && savedDriver.lastSplitPosition >= 0
      ? savedDriver.lastSplitPosition
      : 0;
  driver.bestSplitsMs = Array.isArray(savedDriver.bestSplitsMs)
    ? savedDriver.bestSplitsMs.map((value) => (Number.isFinite(value) ? value : null))
    : [];
  driver.currentLapSplitMarkersMs = Array.isArray(savedDriver.currentLapSplitMarkersMs)
    ? savedDriver.currentLapSplitMarkersMs.filter((value) => Number.isFinite(value))
    : [];
  driver.currentLapSplitsMs = Array.isArray(savedDriver.currentLapSplitsMs)
    ? savedDriver.currentLapSplitsMs.filter((value) => Number.isFinite(value))
    : [];
  driver.lastSplitsMs = Array.isArray(savedDriver.lastSplitsMs)
    ? savedDriver.lastSplitsMs.filter((value) => Number.isFinite(value))
    : [];
  driver.lapHistory = Array.isArray(savedDriver.lapHistory)
    ? savedDriver.lapHistory
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          lapIndex:
            Number.isFinite(entry.lapIndex) && entry.lapIndex > 0 ? entry.lapIndex : driver.lapHistory.length + 1,
          lapMs: Number.isFinite(entry.lapMs) ? entry.lapMs : 0,
          splitsMs: Array.isArray(entry.splitsMs) ? entry.splitsMs.filter((value) => Number.isFinite(value)) : [],
          recordedAtUnixMs: Number.isFinite(entry.recordedAtUnixMs) ? entry.recordedAtUnixMs : null,
        }))
    : [];
  return driver;
}

export function restoreAppState(snapshot, settings = normalizeSettings(), timeSource = createSystemTimeSource()) {
  if (!snapshot || typeof snapshot !== "object") {
    return createInitialAppState(settings);
  }

  const state = {
    version: APP_STATE_VERSION,
    mode: normalizeMode(snapshot.mode || settings.preferredMode),
    isActive: Boolean(snapshot.isActive),
    createdAt: Number.isFinite(snapshot.createdAt) ? snapshot.createdAt : timeSource.nowUnixMs(),
    updatedAt: Number.isFinite(snapshot.updatedAt) ? snapshot.updatedAt : timeSource.nowUnixMs(),
    nextEventId: Number.isFinite(snapshot.nextEventId) && snapshot.nextEventId > 0 ? snapshot.nextEventId : 1,
    eventLog: Array.isArray(snapshot.eventLog)
      ? snapshot.eventLog
          .filter((entry) => entry && typeof entry === "object")
          .slice(-MAX_EVENT_LOG)
      : [],
    drivers: DEFAULT_LABELS.map((_, index) => hydrateDriver(snapshot.drivers?.[index], index, settings)),
  };

  rehydrateRunningAnchors(state, timeSource);
  updateStateMeta(state, timeSource);
  return state;
}

export function rehydrateRunningAnchors(state, timeSource = createSystemTimeSource()) {
  const nowUnix = timeSource.nowUnixMs();
  const nowMono = timeSource.nowMonoMs();

  state.drivers.forEach((driver) => {
    if (driver.status !== "running" || !Number.isFinite(driver.runningSinceUnixMs)) {
      driver.runningSinceUnixMs = null;
      driver.runningSinceMonoMs = null;
      if (driver.status === "running") {
        driver.status = "paused";
      }
      return;
    }

    const delta = nowUnix - driver.runningSinceUnixMs;
    driver.runningSinceMonoMs = nowMono - delta;
  });
}

export function hasAnyRunningDrivers(state) {
  return state.drivers.some((driver) => driver.status === "running");
}

export function hasAnyTimingData(state) {
  return state.drivers.some(
    (driver) =>
      driver.lapHistory.length > 0 ||
      driver.currentLapElapsedMs > 0 ||
      driver.lastLapMs != null ||
      driver.lastSplitMs != null ||
      driver.status !== "idle"
  );
}

export function getDriverElapsedMs(driver, timeSource = createSystemTimeSource()) {
  if (driver.status !== "running") {
    return driver.currentLapElapsedMs;
  }

  const runningSince = Number.isFinite(driver.runningSinceMonoMs) ? driver.runningSinceMonoMs : timeSource.nowMonoMs();
  const delta = timeSource.nowMonoMs() - runningSince;
  return Math.max(0, driver.currentLapElapsedMs + delta);
}

function updateStateMeta(state, timeSource) {
  state.isActive = hasAnyRunningDrivers(state);
  state.updatedAt = timeSource.nowUnixMs();
}

function appendEvent(state, timeSource, driverId, type, extra = {}) {
  state.eventLog.push({
    id: state.nextEventId,
    type,
    driverId,
    lapIndex: extra.lapIndex ?? null,
    splitIndex: extra.splitIndex ?? null,
    monotonicMs: Math.round(timeSource.nowMonoMs()),
    unixMs: timeSource.nowUnixMs(),
  });
  state.nextEventId += 1;
  if (state.eventLog.length > MAX_EVENT_LOG) {
    state.eventLog = state.eventLog.slice(-MAX_EVENT_LOG);
  }
}

function startRunningSegment(driver, timeSource) {
  const nowUnix = timeSource.nowUnixMs();
  driver.status = "running";
  driver.runningSinceUnixMs = nowUnix;
  driver.runningSinceMonoMs = timeSource.nowMonoMs();
  if (!Number.isFinite(driver.lapStartedAtUnixMs)) {
    driver.lapStartedAtUnixMs = nowUnix;
  }
}

function pauseDriver(driver, timeSource) {
  if (driver.status !== "running") {
    return driver.currentLapElapsedMs;
  }

  driver.currentLapElapsedMs = getDriverElapsedMs(driver, timeSource);
  driver.status = "paused";
  driver.runningSinceUnixMs = null;
  driver.runningSinceMonoMs = null;
  return driver.currentLapElapsedMs;
}

function resetLapTiming(driver) {
  driver.currentLapElapsedMs = 0;
  driver.lapStartedAtUnixMs = null;
  driver.splitCount = 0;
  driver.lastSplitMs = null;
  driver.lastSplitPosition = 0;
  driver.currentLapSplitMarkersMs = [];
  driver.currentLapSplitsMs = [];
}

function markLap(driver, state, timeSource) {
  const lapTime = getDriverElapsedMs(driver, timeSource);
  const previousBest = driver.bestLapMs;
  driver.lastLapMs = lapTime;
  driver.lastSplitsMs = [...driver.currentLapSplitsMs];
  driver.lapHistory.push({
    lapIndex: driver.lapIndex,
    lapMs: lapTime,
    splitsMs: [...driver.currentLapSplitsMs],
    recordedAtUnixMs: timeSource.nowUnixMs(),
  });

  if (driver.bestLapMs == null || lapTime < driver.bestLapMs) {
    driver.bestLapMs = lapTime;
    driver.bestLapLapIndex = driver.lapIndex;
  }

  driver.lastLapTrend = previousBest == null || lapTime < previousBest ? "faster" : "slower";

  appendEvent(state, timeSource, driver.driverId, "lap", {
    lapIndex: driver.lapIndex,
  });

  driver.lapIndex += 1;
  resetLapTiming(driver);
  startRunningSegment(driver, timeSource);
}

function recordSplit(driver, state, timeSource) {
  if (driver.status !== "running") {
    return false;
  }

  const lapElapsed = getDriverElapsedMs(driver, timeSource);
  const previousMarker = driver.currentLapSplitMarkersMs[driver.currentLapSplitMarkersMs.length - 1] || 0;
  const splitMs = Math.max(0, lapElapsed - previousMarker);
  const splitIndex = driver.currentLapSplitMarkersMs.length + 1;

  driver.currentLapSplitMarkersMs.push(lapElapsed);
  driver.currentLapSplitsMs.push(splitMs);
  driver.splitCount = splitIndex;
  driver.lastSplitMs = splitMs;
  driver.lastSplitPosition = splitIndex;

  const currentBest = driver.bestSplitsMs[splitIndex - 1];
  if (currentBest == null || splitMs < currentBest) {
    driver.bestSplitsMs[splitIndex - 1] = splitMs;
  }

  appendEvent(state, timeSource, driver.driverId, "split", {
    lapIndex: driver.lapIndex,
    splitIndex,
  });
  return true;
}

function resetDriver(driver, label) {
  const fresh = createDriverState(driver.driverId, label);
  Object.assign(driver, fresh);
}

export function applySettingsToState(state, settings) {
  state.mode = normalizeMode(state.mode || settings.preferredMode);
  state.drivers.forEach((driver, index) => {
    driver.label = sanitizeDriverLabel(driver.label, settings.driverLabels[index] || DEFAULT_LABELS[index]);
  });
}

export function performAction(state, action, timeSource = createSystemTimeSource()) {
  const driver = action.driverId ? state.drivers[action.driverId - 1] : null;

  switch (action.type) {
    case "lapButton":
      if (!driver) {
        break;
      }
      if (driver.status === "idle") {
        driver.status = "idle";
        startRunningSegment(driver, timeSource);
        appendEvent(state, timeSource, driver.driverId, "start", { lapIndex: driver.lapIndex });
      } else if (driver.status === "paused") {
        startRunningSegment(driver, timeSource);
        appendEvent(state, timeSource, driver.driverId, "resume", { lapIndex: driver.lapIndex });
      } else {
        markLap(driver, state, timeSource);
      }
      break;

    case "splitButton":
      if (driver) {
        recordSplit(driver, state, timeSource);
      }
      break;

    case "stopDriver":
      if (driver && driver.status === "running") {
        pauseDriver(driver, timeSource);
        appendEvent(state, timeSource, driver.driverId, "stop", { lapIndex: driver.lapIndex });
      }
      break;

    case "stopAll":
      state.drivers.forEach((entry) => {
        if (entry.status === "running") {
          pauseDriver(entry, timeSource);
          appendEvent(state, timeSource, entry.driverId, "stop", { lapIndex: entry.lapIndex });
        }
      });
      break;

    case "resetAll":
      state.drivers.forEach((entry, index) => {
        resetDriver(entry, entry.label || DEFAULT_LABELS[index]);
      });
      state.eventLog = [];
      state.nextEventId = 1;
      appendEvent(state, timeSource, null, "reset");
      break;

    case "setMode":
      state.mode = normalizeMode(action.mode);
      break;

    default:
      break;
  }

  updateStateMeta(state, timeSource);
  return state;
}

export function cloneStateForStorage(state) {
  return {
    version: APP_STATE_VERSION,
    mode: normalizeMode(state.mode),
    isActive: Boolean(state.isActive),
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    nextEventId: state.nextEventId,
    eventLog: state.eventLog.slice(-MAX_EVENT_LOG),
    drivers: state.drivers.map((driver) => ({
      driverId: driver.driverId,
      label: driver.label,
      status: driver.status,
      lapIndex: driver.lapIndex,
      currentLapElapsedMs: driver.currentLapElapsedMs,
      lapStartedAtUnixMs: driver.lapStartedAtUnixMs,
      runningSinceUnixMs: driver.runningSinceUnixMs,
      lastLapMs: driver.lastLapMs,
      bestLapMs: driver.bestLapMs,
      bestLapLapIndex: driver.bestLapLapIndex,
      lastLapTrend: driver.lastLapTrend,
      splitCount: driver.splitCount,
      lastSplitMs: driver.lastSplitMs,
      lastSplitPosition: driver.lastSplitPosition,
      bestSplitsMs: [...driver.bestSplitsMs],
      currentLapSplitMarkersMs: [...driver.currentLapSplitMarkersMs],
      currentLapSplitsMs: [...driver.currentLapSplitsMs],
      lastSplitsMs: [...driver.lastSplitsMs],
      lapHistory: driver.lapHistory.map((entry) => ({
        lapIndex: entry.lapIndex,
        lapMs: entry.lapMs,
        splitsMs: [...entry.splitsMs],
        recordedAtUnixMs: entry.recordedAtUnixMs,
      })),
    })),
  };
}

export function buildExportRows(state) {
  return state.drivers.flatMap((driver) =>
    driver.lapHistory.map((lap) => ({
      driverId: driver.driverId,
      label: driver.label,
      lapIndex: lap.lapIndex,
      lapMs: lap.lapMs,
      splitsMs: lap.splitsMs,
      recordedAtUnixMs: lap.recordedAtUnixMs,
    }))
  );
}
