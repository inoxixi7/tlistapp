// app/lib/firebase.ts
// Firebase 初始化。请将配置替换为你的 Firebase 项目配置。
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAz4QyTkuR0kkm2m948qLKbtIl7ZJ5x5rc",
  authDomain: "tlist-a6a35.firebaseapp.com",
  projectId: "tlist-a6a35",
  storageBucket: "tlist-a6a35.firebasestorage.app",
  messagingSenderId: "291114813832",
  appId: "1:291114813832:web:9cd88428f19f15a432923d",
  measurementId: "G-23WEXL6YPM"
};

let app: FirebaseApp | undefined;
if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  app = initializeApp(firebaseConfig);
}

export const firebaseApp = app;
export const auth = app ? getAuth(app) : undefined as any;
export const db = app ? getFirestore(app) : undefined as any;
