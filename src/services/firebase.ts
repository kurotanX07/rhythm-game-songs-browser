import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
// First try to use environment variables, then fall back to hardcoded values if needed
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDehw9IeFrsyl1Ot0LulKXFxFgDyFlDavs",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "rhythm-game-app.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "rhythm-game-app",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "rhythm-game-app.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "884744923644",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:884744923644:web:676f24c3c8de5610932a79"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get service instances
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Connect to emulators for local development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('Connected to Firebase emulators');
}

export default app;

// Firestore rules reference
export const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Games data - read by anyone, write by admins
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Songs data - read by anyone, write by admins
    match /songs/{songId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Update status - user can read their own, admin can read/write all
    match /updateStatus/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && (request.auth.uid == userId || request.auth.token.admin == true);
    }
    
    // Excel structures - read by authenticated users, write by admins
    match /excelStructures/{gameId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
`;

// Storage rules reference
export const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /excel/{gameId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
`;