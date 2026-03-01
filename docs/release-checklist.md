# Release Checklist

## Before Shipping

- Run `npm test`
- Run `npm run test:e2e`
- Run `npm run build`
- Verify `manifest.json` names and icons
- Verify the service worker precache list includes all stable non-hashed assets
- Verify a fresh load still works after clearing site data and reloading once
- Verify offline navigation loads the shell after one successful online visit
- Confirm CSV export works in the target browser

## Versioning

- Bump `APP_SHELL_VERSION` in both `service-worker.js` and `public/service-worker.js` when the app shell or other precached assets change materially
- Keep the service worker precache list in sync with any new stable files that should work offline
- Keep the app state version in `src/timing-engine.js` in sync with breaking storage changes

## Update Validation

- After a cache-version bump, load the app once online, then reload and confirm the new shell is active
- Confirm old caches are removed after activation
- Confirm `dist/service-worker.js` is emitted by the production build
- Confirm summary, settings, and export still work after the service worker update

## Packaging Later

- If App Store / Play Store distribution is needed, package the web app with Capacitor
- Reuse the same HTML, CSS, JS codebase and add native plugins only where needed
