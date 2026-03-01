# Architecture

## Modules

- `app.js`: browser bootstrap
- `src/app-controller.js`: wires DOM events to engine actions
- `src/timing-engine.js`: canonical state, timing math, export rows
- `src/store.js`: persistence adapter
- `src/feedback.js`: sound, haptics, wake lock
- `src/ui-render.js`: DOM-safe view construction, formatting, and display updates

## State Model

- One `AppSessionState`
- Four `DriverSessionState` entries, always present
- Display mode changes only the rendered layout

## Event Flow

1. User taps a control
2. `app-controller` applies a timing action
3. `timing-engine` mutates the canonical state and appends an event
4. `ui-render` refreshes visible cards
5. `store` persists the current session snapshot

## Persistence Strategy

- Save after every meaningful action
- Save on a background heartbeat while timing is active
- Save on visibility changes and before unload

## Derived Views

- Session summary is derived from `lapHistory`, `bestLapMs`, `lastLapMs`, and `bestSplitsMs`
- Summary data is not persisted separately and should always be recomputed from canonical state
- `buildSessionSummary()` in `src/timing-engine.js` is the source for summary aggregation

## Settings-Driven UI Modes

- `gloveModeEnabled` is stored in user settings and applied as a UI-only body class
- Glove mode must not change timing state, timing math, or fixed-shell layout constraints

## Rendering Strategy

- The primary shell uses a top toolbar (`#mode-header` plus the top-right menu trigger), a fixed timing viewport, and a fixed footer button grid
- `L1` through `L4` and `S1` through `S4` remain pinned in the footer across display modes; the timing cards absorb reclaimed layout space
- The lap/split footer is a hard layout invariant: its on-screen position must not change when switching between 1-driver, 2-driver, and 4-driver modes
- The live running timer is a hard visual-priority invariant and must remain more prominent than names, lap metadata, and secondary metrics in every mode
- Metric labels (`Last`, `Best`, `Diff`, `Split`) are a physical-device-style anchor and must not shift position when values change
- Timing cards and summary cards are built with DOM node creation and `replaceChildren()`
- User-derived values such as driver labels should be assigned through `textContent`
- Avoid reintroducing HTML-string rendering for user-influenced content

## Testing Seams

- `src/timing-engine.js` is the primary unit-test seam and is exercised with fake clocks in Vitest
- `src/app-controller.js` and `src/ui-render.js` are covered by Playwright flow tests for key user journeys and mobile shell behavior
- Timing and export regressions should be proven in engine tests before UI-heavy changes land

## Menu Actions

- The top-right hamburger menu is a controller-driven UI action surface owned by `src/app-controller.js`
- The menu action order is fixed as `Stop Timing`, `Reset Timing`, `Summary`, `Export CSV`, `Settings`, `Help`
- CSV export is triggered from the menu flow, not from a dedicated footer button
- Summary, Settings, Help, Stop Timing, and Reset remain menu actions layered on top of the same canonical timing state

## PWA Strategy

- Module entrypoint runs as a standard web app
- Service worker caches the static shell and runtime modules
- Manifest enables standalone installation
