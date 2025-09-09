// 文件用途：
// - Web 端专用 Firebase 初始化（硬编码配置，便于快速开发演示）。
// - 若要改为 .env，请迁移到通用实现 app/lib/firebase.ts。
// app/lib/firebase.web.ts
// Web 专用的 Firebase 初始化（使用你提供的硬编码配置）。
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 你的 Web 配置（如需改为 .env，请切回 app/lib/firebase.ts 的实现）
const firebaseConfig = {
  apiKey: "AIzaSyAz4QyTkuR0kkm2m948qLKbtIl7ZJ5x5rc",
  authDomain: "tlist-a6a35.firebaseapp.com",
  projectId: "tlist-a6a35",
  storageBucket: "tlist-a6a35.appspot.com",
  messagingSenderId: "291114813832",
  appId: "1:291114813832:web:9cd88428f19f15a432923d",
  measurementId: "G-23WEXL6YPM"
} as const;

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);

// 可选：按需初始化 Analytics（仅在浏览器支持时）
export let analytics: Analytics | null = null;
void (async () => {
  try {
    if (await isSupported()) analytics = getAnalytics(app);
  } catch {
    // ignore analytics init errors
  }
})();
