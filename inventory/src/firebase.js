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

import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from "firebase/firestore";
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

// Authentication
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const signUpWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const signInWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
export const logOut = () => signOut(auth);
export { auth };

// Firestore
const db = getFirestore(app);

// Function to send notifications
const sendNotification = async (type, data, recipients) => {
  try {
    // Add notification to Firestore
    const notificationData = {
      title: getNotificationTitle(type, data),
      message: getNotificationMessage(type, data),
      type: type,
      read: false,
      createdAt: serverTimestamp(),
      recipientRoles: recipients,
      category: data.category || 'General'
    };

    await addDoc(collection(db, 'notifications'), notificationData);

  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Helper function to get notification title
const getNotificationTitle = (type, data) => {
  switch (type) {
    case 'low_stock':
      return `Low Stock Alert: ${data.name}`;
    case 'expiring_soon':
      return `Expiring Soon: ${data.name}`;
    case 'expired':
      return `Item Expired: ${data.name}`;
    case 'damaged':
      return `Item Damaged: ${data.name}`;
    case 'update':
      return `Item Updated: ${data.name}`;
    default:
      return 'Inventory Notification';
  }
};

// Helper function to get notification message
const getNotificationMessage = (type, data) => {
  switch (type) {
    case 'low_stock':
      return `${data.name} is running low on stock (Quantity: ${data.qty})`;
    case 'expiring_soon':
      return `${data.name} will expire on ${data.expiry}`;
    case 'expired':
      return `${data.name} has expired on ${data.expiry}`;
    case 'damaged':
      return `${data.name} has been marked as damaged`;
    case 'update':
      return `${data.name} has been updated in the inventory`;
    default:
      return 'Please check the inventory system for details';
  }
};

export { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  sendNotification 
};
