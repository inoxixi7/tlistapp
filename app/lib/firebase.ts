// app/lib/firebase.ts
// Firebase 初始化。请将配置替换为你的 Firebase 项目配置。
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | undefined;
if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  app = initializeApp(firebaseConfig);
}

export const firebaseApp = app;
export const auth = app ? getAuth(app) : undefined as any;
export const db = app ? getFirestore(app) : undefined as any;
