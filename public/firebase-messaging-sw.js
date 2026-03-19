importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

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

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

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

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message", payload);

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
