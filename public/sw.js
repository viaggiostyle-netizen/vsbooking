const CACHE_NAME = "viaggiostyle-v3";
const urlsToCache = [
  "/",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/icons/icon-light-192.png",
  "/icons/icon-light-512.png",
  "/icons/icon-dark-192.png",
  "/icons/icon-dark-512.png",
  "/icons/notification-badge.svg",
];

const NETWORK_ONLY_PREFIXES = ["/api/", "/auth", "/admin"];
const STATIC_PREFIXES = ["/icons/", "/_next/static/"];
const STATIC_DESTINATIONS = new Set(["font", "image", "manifest", "script", "style"]);

function isStaticAssetRequest(request, pathname) {
  if (urlsToCache.includes(pathname)) return true;
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return STATIC_DESTINATIONS.has(request.destination);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (NETWORK_ONLY_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const fallback = await caches.match("/");
        return fallback || Response.error();
      })
    );
    return;
  }

  if (!isStaticAssetRequest(event.request, url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    })
  );
});
