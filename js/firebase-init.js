import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Replace these with the values from Firebase Console > Project settings > Your apps > SDK setup.
// This key is meant to be public (it just identifies the project) — access is controlled by
// Firestore security rules and the ALLOWED_EMAILS allowlist in js/auth.js, not by hiding this.
const firebaseConfig = {
  apiKey: "AIzaSyARJuYbF7iaztHBq1VhZ0a7gDjOYZSl6xI",
  authDomain: "meal-plan-tracker-560b2.firebaseapp.com",
  projectId: "meal-plan-tracker-560b2",
  storageBucket: "meal-plan-tracker-560b2.firebasestorage.app",
  messagingSenderId: "952744846662",
  appId: "1:952744846662:web:845753e7c9971693197147",
};

export const isConfigured = firebaseConfig.apiKey !== "REPLACE_ME";

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;
