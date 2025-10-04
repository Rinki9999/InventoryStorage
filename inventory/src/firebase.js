// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAdm0UN1UoeFqIwQj_iX6CF7QfLVZQwmY8",
  authDomain: "inventory-b1e8d.firebaseapp.com",
  projectId: "inventory-b1e8d",
  storageBucket: "inventory-b1e8d.firebasestorage.app",
  messagingSenderId: "388920844869",
  appId: "1:388920844869:web:91a2da52919023acfcf92c",
  measurementId: "G-K9B1KZQN7Z",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Authentication
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = () => signInWithPopup(auth, provider);

// Sign up with email/password
export const signUpWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

// Sign in with email/password
export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

// Listen to auth state changes
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// Logout
export const logOut = () => signOut(auth);

export { auth };
