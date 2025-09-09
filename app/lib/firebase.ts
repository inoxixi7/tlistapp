// app/lib/firebase.ts
// Firebase 初始化：从 EXPO_PUBLIC_* 环境变量读取配置；在原生端启用 AsyncStorage 持久化。
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 从环境变量读取（请在项目根目录 .env 中配置这些变量）
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, // 一般形如 <project-id>.appspot.com
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

let app: FirebaseApp | undefined;
if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  app = initializeApp(firebaseConfig as any);
}

export const firebaseApp = app;

// 在原生端优先初始化带持久化的 Auth；如果已初始化则回退到 getAuth。
export const auth = app ? getAuth(app) : (undefined as any);

export const db = app ? getFirestore(app) : (undefined as any);
