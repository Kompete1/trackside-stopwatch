# Trackside Stopwatch

Trackside Stopwatch is a PWA-first lap timer built for one marshal using one phone at trackside. It supports 1-driver, 2-driver, and 4-driver layouts while keeping one shared timing engine underneath.

## What It Does

- Starts, laps, splits, pauses, and resumes up to four drivers
- Uses sector-style splits instead of cumulative split timing
- Saves the current session in local storage and offers restore on reload
- Exports completed laps to CSV
- Supports optional haptics, sound feedback, and screen wake lock
- Runs as a static web app and can be installed as a PWA

## Local Development

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`
3. Open the local Vite URL in a browser

## Testing

- Run unit tests with `npm test`
- Run the Playwright smoke test with `npm run test:e2e`

## PWA Notes

- `app.js` registers the service worker on page load
- `service-worker.js` caches the core shell and module files for offline reuse
- `manifest.json` is configured for standalone install mode

## Current Structure

- `app.js`: module bootstrap and service worker registration
- `src/timing-engine.js`: canonical timer state and timing actions
- `src/app-controller.js`: DOM wiring, persistence, settings, export, feedback hooks
- `src/ui-render.js`: layout rendering and display formatting
- `src/store.js`: local storage adapter
- `src/feedback.js`: sound, haptics, and wake lock behavior

## Known Limits

- Store packaging for iOS/Android is not implemented yet
- The Playwright test suite is a minimal smoke layer only
- CSV export covers completed laps, not full event-log replay
