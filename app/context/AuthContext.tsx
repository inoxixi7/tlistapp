// app/context/AuthContext.tsx
import { auth } from '@/app/lib/firebase';
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';

// 仅 Web 支持登录；原生端暂时禁用

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      if (Platform.OS === 'web') {
        // Web 端用原生 alert，避免某些环境下 Alert 不显示
        window.alert('Firebase 未初始化：请在项目根目录创建 .env，填入 EXPO_PUBLIC_FIREBASE_*，并重启 dev server。');
        console.error('[Auth] Firebase auth not initialized. Check .env and restart dev server.');
      } else {
        Alert.alert('未配置 Firebase', '请检查 .env 是否填好 EXPO_PUBLIC_FIREBASE_* 并重启开发服务。');
      }
      return;
    }
  const provider = new GoogleAuthProvider();
  if (Platform.OS === 'web') {
      try {
        await signInWithPopup(auth, provider);
      } catch (e: any) {
        // 浏览器拦截弹窗或用户快速点击导致的冲突时，回退到 redirect 流程
        const code = e?.code as string | undefined;
        if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, provider);
        } else {
          throw e;
        }
      }
      return;
    }
  Alert.alert('移动端暂不支持', '当前仅支持在 Web 端登录，请在浏览器中使用。');
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) {
      if (Platform.OS === 'web') {
        window.alert('Firebase 未初始化：请检查 .env 并重启 dev server。');
      } else {
        Alert.alert('未配置 Firebase', '请检查 .env 是否填好 EXPO_PUBLIC_FIREBASE_* 并重启开发服务。');
      }
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('移动端暂不支持', '当前仅支持在 Web 端登录，请在浏览器中使用。');
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) {
      if (Platform.OS === 'web') {
        window.alert('Firebase 未初始化：请检查 .env 并重启 dev server。');
      } else {
        Alert.alert('未配置 Firebase', '请检查 .env 是否填好 EXPO_PUBLIC_FIREBASE_* 并重启开发服务。');
      }
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('移动端暂不支持', '当前仅支持在 Web 端注册，请在浏览器中使用。');
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }),
    [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
