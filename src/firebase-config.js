// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCAg-hLdeKDKWV9u6PsSnbTYXhD7OxnBE8",
    authDomain: "trip-planner-cd9b7.firebaseapp.com",
    projectId: "trip-planner-cd9b7",
    storageBucket: "trip-planner-cd9b7.firebasestorage.app",
    messagingSenderId: "37029101965",
    appId: "1:37029101965:web:27d8871db92c2774f23dc4",
};

// App Check(docs/firestore-design.md「セキュリティ方針」参照): reCAPTCHA v3で
// このアプリ経由の正規リクエストであることを検証する。サイトキーは秘匿情報ではない。
const RECAPTCHA_V3_SITE_KEY = "6LcCmIotAAAAAFWN5pOZSWxDizlmBj_FQzA-elwW";

export const app = initializeApp(firebaseConfig);
export const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
});
export const db = getFirestore(app);
