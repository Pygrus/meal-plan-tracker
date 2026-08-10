import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Add every household member's Google account email here (lowercase).
export const ALLOWED_EMAILS = [
  "anthonypruski@gmail.com",
  "tmowersnstuff@gmail.com",
  "amayaxchanx@gmail.com",
  // "jennifer@example.com",
];

export function isAllowed(user) {
  return !!user && ALLOWED_EMAILS.includes((user.email || "").toLowerCase());
}

const provider = new GoogleAuthProvider();

export function signIn() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return fbSignOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
