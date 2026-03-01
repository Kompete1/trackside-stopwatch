import test from "node:test";
import assert from "node:assert/strict";

import {
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

test("stop keeps elapsed time exact across pauses", () => {
  const clock = createFakeTimeSource();
  const state = createInitialAppState(normalizeSettings());

  performAction(state, { type: "lapButton", driverId: 1 }, clock);
  clock.advance(1500);
  performAction(state, { type: "stopDriver", driverId: 1 }, clock);

  assert.equal(state.drivers[0].currentLapElapsedMs, 1500);

  clock.advance(400);
  performAction(state, { type: "lapButton", driverId: 1 }, clock);
  clock.advance(600);
  performAction(state, { type: "stopDriver", driverId: 1 }, clock);

  assert.equal(state.drivers[0].currentLapElapsedMs, 2100);
});

test("sector splits track by split position", () => {
  const clock = createFakeTimeSource();
  const state = createInitialAppState(normalizeSettings());

  performAction(state, { type: "lapButton", driverId: 1 }, clock);
  clock.advance(10_000);
  performAction(state, { type: "splitButton", driverId: 1 }, clock);
  clock.advance(5_000);
  performAction(state, { type: "splitButton", driverId: 1 }, clock);

  assert.equal(state.drivers[0].lastSplitMs, 5_000);
  assert.equal(state.drivers[0].bestSplitsMs[0], 10_000);
  assert.equal(state.drivers[0].bestSplitsMs[1], 5_000);

  clock.advance(7_000);
  performAction(state, { type: "lapButton", driverId: 1 }, clock);
  clock.advance(9_000);
  performAction(state, { type: "splitButton", driverId: 1 }, clock);

  assert.equal(state.drivers[0].bestSplitsMs[0], 9_000);
  assert.equal(state.drivers[0].bestSplitsMs[1], 5_000);
});

test("running sessions restore with elapsed time intact", () => {
  const clock = createFakeTimeSource();
  const state = createInitialAppState(normalizeSettings());

  performAction(state, { type: "lapButton", driverId: 1 }, clock);
  clock.advance(800);

  const snapshot = cloneStateForStorage(state);
  clock.advance(500);

  const restored = restoreAppState(snapshot, normalizeSettings(), clock);
  const elapsed = getDriverElapsedMs(restored.drivers[0], clock);

  assert.equal(elapsed, 1300);
  assert.equal(restored.drivers[0].status, "running");
});
