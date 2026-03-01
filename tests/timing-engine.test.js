import { describe, expect, test } from "vitest";

import {
  buildSessionSummary,
  buildExportRows,
  cloneStateForStorage,
  createInitialAppState,
  getDriverElapsedMs,
  normalizeSettings,
  performAction,
  restoreAppState,
} from "../src/timing-engine.js";

function createFakeTimeSource() {
  let unixMs = 1_000;
  let monoMs = 50;

  return {
    nowUnixMs: () => unixMs,
    nowMonoMs: () => monoMs,
    advance(ms) {
      unixMs += ms;
      monoMs += ms;
    },
  };
}

function createState() {
  return createInitialAppState(normalizeSettings());
}

describe("timing engine", () => {
  test("normalizes glove mode settings with a safe default", () => {
    expect(normalizeSettings().gloveModeEnabled).toBe(false);
    expect(normalizeSettings({ gloveModeEnabled: true }).gloveModeEnabled).toBe(true);
  });

  test("normalizes driver labels to uppercase and allows 10 characters", () => {
    const settings = normalizeSettings({
      driverLabels: [" racerkent1! ", "ab", "third", "fourth"],
    });

    expect(settings.driverLabels[0]).toBe("RACERKENT1");
  });

  test("stop keeps elapsed time exact across repeated pauses", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(1_500);
    performAction(state, { type: "stopDriver", driverId: 1 }, clock);

    expect(state.drivers[0].currentLapElapsedMs).toBe(1_500);

    clock.advance(400);
    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(600);
    performAction(state, { type: "stopDriver", driverId: 1 }, clock);

    expect(state.drivers[0].currentLapElapsedMs).toBe(2_100);
    expect(state.drivers[0].status).toBe("paused");
  });

  test("single-driver flow records laps, splits, and reset events", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(4_000);
    performAction(state, { type: "splitButton", driverId: 1 }, clock);
    clock.advance(3_000);
    performAction(state, { type: "lapButton", driverId: 1 }, clock);

    expect(state.drivers[0].lastLapMs).toBe(7_000);
    expect(state.drivers[0].lapHistory).toHaveLength(1);
    expect(state.drivers[0].lapHistory[0].splitsMs).toEqual([4_000]);
    expect(state.eventLog.map((entry) => entry.type)).toEqual(["start", "split", "lap"]);

    performAction(state, { type: "resetAll" }, clock);

    expect(state.drivers[0].status).toBe("idle");
    expect(state.drivers[0].lapHistory).toHaveLength(0);
    expect(state.eventLog).toHaveLength(1);
    expect(state.eventLog[0].type).toBe("reset");
    expect(state.nextEventId).toBe(2);
  });

  test("two drivers run independently and stop-all pauses both without losing elapsed time", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(1_200);
    performAction(state, { type: "lapButton", driverId: 2 }, clock);
    clock.advance(800);
    performAction(state, { type: "stopAll" }, clock);

    expect(state.drivers[0].status).toBe("paused");
    expect(state.drivers[1].status).toBe("paused");
    expect(state.drivers[0].currentLapElapsedMs).toBe(2_000);
    expect(state.drivers[1].currentLapElapsedMs).toBe(800);

    clock.advance(600);
    expect(getDriverElapsedMs(state.drivers[0], clock)).toBe(2_000);
    expect(getDriverElapsedMs(state.drivers[1], clock)).toBe(800);
  });

  test("four drivers keep separate state through mixed actions", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    for (let driverId = 1; driverId <= 4; driverId += 1) {
      performAction(state, { type: "lapButton", driverId }, clock);
      clock.advance(250);
    }

    clock.advance(750);
    performAction(state, { type: "splitButton", driverId: 3 }, clock);
    clock.advance(500);
    performAction(state, { type: "lapButton", driverId: 4 }, clock);
    performAction(state, { type: "stopDriver", driverId: 2 }, clock);

    expect(state.drivers[0].status).toBe("running");
    expect(state.drivers[1].status).toBe("paused");
    expect(state.drivers[2].lastSplitPosition).toBe(1);
    expect(state.drivers[2].lastSplitMs).toBe(1_250);
    expect(state.drivers[3].lapHistory).toHaveLength(1);
    expect(state.drivers[3].lapIndex).toBe(2);
  });

  test("mode changes do not alter active elapsed time", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(1_750);

    performAction(state, { type: "setMode", mode: 2 }, clock);
    performAction(state, { type: "setMode", mode: 4 }, clock);

    expect(state.mode).toBe(4);
    expect(getDriverElapsedMs(state.drivers[0], clock)).toBe(1_750);
    expect(state.drivers[0].status).toBe("running");
  });

  test("sector splits track by split position only", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(10_000);
    performAction(state, { type: "splitButton", driverId: 1 }, clock);
    clock.advance(5_000);
    performAction(state, { type: "splitButton", driverId: 1 }, clock);

    expect(state.drivers[0].lastSplitMs).toBe(5_000);
    expect(state.drivers[0].bestSplitsMs[0]).toBe(10_000);
    expect(state.drivers[0].bestSplitsMs[1]).toBe(5_000);

    clock.advance(7_000);
    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(9_000);
    performAction(state, { type: "splitButton", driverId: 1 }, clock);

    expect(state.drivers[0].bestSplitsMs[0]).toBe(9_000);
    expect(state.drivers[0].bestSplitsMs[1]).toBe(5_000);
  });

  test("running sessions restore with elapsed time intact", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(800);

    const snapshot = cloneStateForStorage(state);
    clock.advance(500);

    const restored = restoreAppState(snapshot, normalizeSettings(), clock);
    const elapsed = getDriverElapsedMs(restored.drivers[0], clock);

    expect(elapsed).toBe(1_300);
    expect(restored.drivers[0].status).toBe("running");
  });

  test("paused sessions restore without resuming the clock", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(900);
    performAction(state, { type: "stopDriver", driverId: 1 }, clock);

    const snapshot = cloneStateForStorage(state);
    clock.advance(1_200);

    const restored = restoreAppState(snapshot, normalizeSettings(), clock);

    expect(restored.drivers[0].status).toBe("paused");
    expect(getDriverElapsedMs(restored.drivers[0], clock)).toBe(900);
  });

  test("export rows preserve lap ordering and mixed split counts", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(3_000);
    performAction(state, { type: "splitButton", driverId: 1 }, clock);
    clock.advance(2_000);
    performAction(state, { type: "lapButton", driverId: 1 }, clock);

    performAction(state, { type: "lapButton", driverId: 2 }, clock);
    clock.advance(4_000);
    performAction(state, { type: "lapButton", driverId: 2 }, clock);

    const rows = buildExportRows(state);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      driverId: 1,
      lapIndex: 1,
      lapMs: 5_000,
      splitsMs: [3_000],
    });
    expect(rows[1]).toMatchObject({
      driverId: 2,
      lapIndex: 1,
      lapMs: 4_000,
      splitsMs: [],
    });
  });

  test("session summary derives per-driver lap aggregates from visible drivers", () => {
    const clock = createFakeTimeSource();
    const state = createState();

    performAction(state, { type: "lapButton", driverId: 1 }, clock);
    clock.advance(3_000);
    performAction(state, { type: "splitButton", driverId: 1 }, clock);
    clock.advance(2_000);
    performAction(state, { type: "lapButton", driverId: 1 }, clock);

    performAction(state, { type: "lapButton", driverId: 2 }, clock);
    clock.advance(4_000);
    performAction(state, { type: "lapButton", driverId: 2 }, clock);

    performAction(state, { type: "setMode", mode: 2 }, clock);
    const summary = buildSessionSummary(state);

    expect(summary.visibleDrivers).toBe(2);
    expect(summary.totalCompletedLaps).toBe(2);
    expect(summary.drivers[0]).toMatchObject({
      driverId: 1,
      label: "A",
      completedLaps: 1,
      bestLapMs: 5_000,
      lastLapMs: 5_000,
      bestSplitsMs: [3_000],
    });
    expect(summary.drivers[1]).toMatchObject({
      driverId: 2,
      label: "B",
      completedLaps: 1,
      bestLapMs: 4_000,
      lastLapMs: 4_000,
      bestSplitsMs: [],
    });
  });
});
