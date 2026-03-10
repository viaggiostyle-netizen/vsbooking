import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";


const firebaseConfig = {
    apiKey: "AIzaSyCEqu4G5ie3llKh8vr3O1SC7X0eo66EB6A",
    authDomain: "barber-system-66cf3.firebaseapp.com",
    projectId: "barber-system-66cf3",
    storageBucket: "barber-system-66cf3.firebasestorage.app",
    messagingSenderId: "412763253101",
    appId: "1:412763253101:web:2e6784f3c8c998f9799264",
    measurementId: "G-6FTQVMGTQM"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const messaging = getMessaging(app); 