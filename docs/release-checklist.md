# Release Checklist

## Before Shipping

- Run `npm test`
- Run `npm run test:e2e`
- Verify `manifest.json` names and icons
- Verify service worker cache list includes all runtime modules
- Confirm CSV export works in the target browser

## Versioning

- Bump the service worker cache name when static assets change materially
- Keep the app state version in `src/timing-engine.js` in sync with breaking storage changes

## Packaging Later

- If App Store / Play Store distribution is needed, package the web app with Capacitor
- Reuse the same HTML, CSS, JS codebase and add native plugins only where needed
