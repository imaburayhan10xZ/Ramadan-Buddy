import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Config from provided google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyAKwU1BzBTyOgH40aWL9dUnbtYXIlkO8R8",
  authDomain: "ramadan-buddy.firebaseapp.com",
  projectId: "ramadan-buddy",
  storageBucket: "ramadan-buddy.firebasestorage.app",
  messagingSenderId: "940656415498",
  appId: "1:940656415498:android:f79fcf51ffa389bc2c20f3"
};

// Check if key is valid (not the placeholder)
export const isFirebaseConfigValid = firebaseConfig.apiKey !== "AIzaSyD-EXAMPLE-KEY-REPLACE-THIS";

// Initialize Modular Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence enabled
// This prevents 'Could not reach Cloud Firestore backend' errors from crashing the UI
// and allows the app to work offline using cached data.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});