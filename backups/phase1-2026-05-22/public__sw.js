importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const CACHE_NAME = "viaggiostyle-v4";
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

const DEFAULT_NOTIFICATION_TITLE = "Nueva notificacion";
const DEFAULT_NOTIFICATION_ICON = "/icons/icon-light-192.png";
const DEFAULT_NOTIFICATION_BADGE = "/icons/notification-badge.svg";
const DEFAULT_CLICK_ACTION = "/admin/agenda";

const firebaseConfig = {
  apiKey: "AIzaSyCEqu4G5ie3llKh8vr3O1SC7X0eo66EB6A",
  authDomain: "barber-system-66cf3.firebaseapp.com",
  projectId: "barber-system-66cf3",
  storageBucket: "barber-system-66cf3.firebasestorage.app",
  messagingSenderId: "412763253101",
  appId: "1:412763253101:web:2e6784f3c8c998f9799264",
  measurementId: "G-6FTQVMGTQM",
};

const firebaseApp = firebase.apps.length
  ? firebase.app()
  : firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(firebaseApp);

function isStaticAssetRequest(request, pathname) {
  if (urlsToCache.includes(pathname)) return true;
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return STATIC_DESTINATIONS.has(request.destination);
}

function buildNotificationFromPayload(payload) {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    DEFAULT_NOTIFICATION_TITLE;
  const body = payload.notification?.body || payload.data?.body || "";
  const icon = payload.notification?.icon || payload.data?.icon || DEFAULT_NOTIFICATION_ICON;
  const badge = payload.notification?.badge || payload.data?.badge || DEFAULT_NOTIFICATION_BADGE;
  const url = payload.data?.click_action || DEFAULT_CLICK_ACTION;

  return {
    title,
    options: {
      body,
      icon,
      badge,
      data: { url },
    },
  };
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

messaging.onBackgroundMessage((payload) => {
  console.log("[sw.js] Received background message", payload);

  // Firebase already renders notification payloads in background.
  if (payload.notification) {
    return;
  }

  const { title, options } = buildNotificationFromPayload(payload);

  if (!title && !options.body) {
    return;
  }

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  const url = event.notification?.data?.url || DEFAULT_CLICK_ACTION;

  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          if (client.url.includes(url)) {
            return client.focus();
          }

          if ("navigate" in client) {
            return client.navigate(url).then(() => client.focus());
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    })
  );
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
