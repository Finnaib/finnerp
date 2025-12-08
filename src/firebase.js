// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// REPLACE these values with your own from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyA5pqqR101MLes4CrPAlI4ffYn4JPq9XD0",
    authDomain: "finnerp-326a6.firebaseapp.com",
    projectId: "finnerp-326a6",
    storageBucket: "finnerp-326a6.firebasestorage.app",
    messagingSenderId: "580624063568",
    appId: "1:580624063568:web:04f79d238cc9f2296a8555",
    measurementId: "G-FXXDW35EPF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);


export default app;
