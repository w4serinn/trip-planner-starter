// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCAg-hLdeKDKWV9u6PsSnbTYXhD7OxnBE8",
    authDomain: "trip-planner-cd9b7.firebaseapp.com",
    projectId: "trip-planner-cd9b7",
    storageBucket: "trip-planner-cd9b7.firebasestorage.app",
    messagingSenderId: "37029101965",
    appId: "1:37029101965:web:27d8871db92c2774f23dc4",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
