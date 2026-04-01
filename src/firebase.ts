import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigValid = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
};

let dbInstance: ReturnType<typeof getFirestore> | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;
let appInitialized: ReturnType<typeof initializeApp> | null = null;

export const isFirebaseEnabled = (): boolean => isFirebaseConfigValid();

export const getFirebaseDb = () => {
  if (!isFirebaseConfigValid()) return null;

  if (!appInitialized) {
    appInitialized = initializeApp(firebaseConfig);
  }

  if (!dbInstance && appInitialized) {
    dbInstance = getFirestore(appInitialized);
  }

  return dbInstance;
};

export const getFirebaseAuth = () => {
  if (!isFirebaseConfigValid()) return null;

  if (!appInitialized) {
    appInitialized = initializeApp(firebaseConfig);
  }

  if (!authInstance && appInitialized) {
    authInstance = getAuth(appInitialized);
  }

  return authInstance;
};
