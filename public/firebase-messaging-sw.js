importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');


const firebaseConfig = {
    apiKey: "AIzaSyCEqu4G5ie3llKh8vr3O1SC7X0eo66EB6A",
    authDomain: "barber-system-66cf3.firebaseapp.com",
    projectId: "barber-system-66cf3",
    storageBucket: "barber-system-66cf3.firebasestorage.app",
    messagingSenderId: "412763253101",
    appId: "1:412763253101:web:2e6784f3c8c998f9799264",
    measurementId: "G-6FTQVMGTQM"
};


const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);

    if (!payload.notification) {
        console.log("No notification content in payload");
        return;
    }

    const notificationTitle = payload.notification.title || "Nueva notificación";
    const notificationOptions = {
        body: payload.notification.body || "",
        icon: '/icons/icon-light-192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
