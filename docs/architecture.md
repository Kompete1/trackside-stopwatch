# Architecture

## Modules

- `app.js`: browser bootstrap
- `src/app-controller.js`: wires DOM events to engine actions
- `src/timing-engine.js`: canonical state, timing math, export rows
- `src/store.js`: persistence adapter
- `src/feedback.js`: sound, haptics, wake lock
- `src/ui-render.js`: templates, formatting, and DOM updates

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

## Testing Seams

- `src/timing-engine.js` is the primary unit-test seam and is exercised with fake clocks in Vitest
- `src/app-controller.js` and `src/ui-render.js` are covered by Playwright flow tests for key user journeys and mobile shell behavior
- Timing and export regressions should be proven in engine tests before UI-heavy changes land

## PWA Strategy

- Module entrypoint runs as a standard web app
- Service worker caches the static shell and runtime modules
- Manifest enables standalone installation
