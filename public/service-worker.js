const APP_SHELL_VERSION = "2026-03-01-v1";
const CACHE_NAME = `trackside-stopwatch-runtime-${APP_SHELL_VERSION}`;
const OFFLINE_NAVIGATION_FALLBACK = "./index.html";
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css",
  "./click.mp3",
  "./mixkit-modern-click-box-check-1120.wav",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/icon-512x512-maskable.png",
];

function shouldCacheResponse(response) {
  return Boolean(response && response.ok && response.type !== "error");
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (shouldCacheResponse(response)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === "navigate") {
          return caches.match(OFFLINE_NAVIGATION_FALLBACK);
        }

        return new Response("", { status: 504, statusText: "Offline" });
      })
  );
});
