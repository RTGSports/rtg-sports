const CACHE_NAME = "rtg-sports-cache-v1";
const OFFLINE_URL = "/offline.html";
const PREFETCH_ASSETS = [
  OFFLINE_URL,
  "/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PREFETCH_ASSETS.map((url) => new Request(url, { cache: "reload" })));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
      await self.clients.claim();
    })()
  );
});

function shouldHandleFetch(event) {
  return (
    event.request.method === "GET" &&
    (event.request.destination === "" || event.request.destination === "document" ||
      event.request.destination === "style" || event.request.destination === "script" ||
      event.request.destination === "image" || event.request.destination === "font")
  );
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandleFetch(event)) {
    return;
  }

  const { request } = event;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (request.url.startsWith(self.location.origin) && networkResponse.ok) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (request.mode === "navigate") {
          const offlineResponse = await cache.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        throw error;
      }
    })()
  );
});