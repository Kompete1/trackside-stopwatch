# Trackside Stopwatch

Trackside Stopwatch is a PWA-first lap timer built for one marshal using one phone at trackside. It supports 1-driver, 2-driver, and 4-driver layouts while keeping one shared timing engine underneath.

## What It Does

- Starts, laps, splits, pauses, and resumes up to four drivers
- Uses sector-style splits instead of cumulative split timing
- Saves the current session in local storage and offers restore on reload
- Exports completed laps to CSV
- Shows a read-only in-app session summary from completed laps
- Supports optional haptics, sound feedback, and screen wake lock
- Blocks manual mode switching while timing is actively running
- Runs as a static web app and can be installed as a PWA

## Local Development

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`
3. Open the local Vite URL in a browser

## Testing

- Run unit tests with `npm test` (Vitest)
- Run only the timing-engine suite with `npm run test:unit`
- Run the Playwright browser flow suite with `npm run test:e2e`

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
- Browser-level flow coverage now covers key user journeys, but it is still lighter than the engine coverage
- CSV export covers completed laps, not full event-log replay
