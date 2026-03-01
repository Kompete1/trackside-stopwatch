# Repo Guidelines

## Purpose

This repo is a static PWA lap timer. Timing accuracy is the highest priority. Any change that can affect elapsed time, lap rollover, split math, or persistence must be treated as a high-risk change.

## Core Rules

- Keep timing logic in `src/timing-engine.js`
- Keep DOM-specific code in `src/app-controller.js` and `src/ui-render.js`
- Do not reintroduce separate timing engines for 1, 2, and 4 driver modes
- Preserve local session recovery unless the product requirement changes
- Avoid adding user-input interpolation directly into HTML strings

## Testing Expectations

- Run `npm test` (Vitest) after timing-engine changes
- Use `npm run test:unit` when iterating specifically on timing-engine behavior
- Run `npm run test:e2e` after UI interaction changes when dependencies are installed
- Prefer stable element IDs for Playwright selectors and keep them intact when adjusting UI structure
- Manually verify start, lap, split, pause, reset, restore, and CSV export on mobile-sized screens

## Safe Edit Boundaries

- Add new timing behavior through `performAction()` and the driver state model
- Add new settings through `normalizeSettings()` and the settings modal wiring
- Keep service worker asset lists in sync with any new runtime modules

## Verification Focus

Always re-check:

- pause does not inflate elapsed time
- split positions compare against the same split position only
- switching display modes does not lose active timers
- active timing blocks manual mode-header layout changes
- local restore matches the pre-refresh state
