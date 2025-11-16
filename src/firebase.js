import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import collections constants
import { COLLECTIONS } from "./constants/collections";

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: "quanlygoiychitieu",
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Initialize Firestore with better error handling
  db = getFirestore(app);

  // Set Firestore settings to handle timeouts better
  // Note: Firestore v9+ doesn't have direct timeout settings,
  // but we can handle errors gracefully

  storage = getStorage(app);

  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });

  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  // Don't throw - allow app to continue in offline mode
}

// Export services
export { auth, db, storage, googleProvider, app };

// Export collections for convenience
export { COLLECTIONS };

export default app;

// Helper
export const isFirebaseReady = () => !!(app && auth && db);
