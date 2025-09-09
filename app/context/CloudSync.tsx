// app/context/CloudSync.tsx
import { db } from '@/app/lib/firebase';
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { useList, type TravelList } from './ListContext';

// 云同步策略（简单版）：
// - 登录后：
//   1) 拉取用户文档下的 lists，若云端有数据则用云覆盖本地；若云端为空则把本地上传到云。
//   2) 订阅云端变化，自动写回本地 AsyncStorage（通过 ListContext 的 upsert/remove）。
// - 本地更新：ListContext 内部已持久化到 AsyncStorage；这里不拦截。
// 注意：实际冲突解决与增量同步更复杂，这里提供基础可用版本。

export const CloudSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { lists, upsertList, removeList, clearAll } = useList();
  const bootstrapped = useRef(false);
  const lastCloudApplyTs = useRef(0);
  const permErrorShown = useRef(false);

  const showPermError = (err: unknown) => {
    if (permErrorShown.current) return;
    permErrorShown.current = true;
    const msg =
      '云同步权限不足：请在 Firebase 控制台 > Firestore 规则中，允许已登录用户访问 users/{uid} 及其子集合 lists/*。' +
      '\n\n示例规则:\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /users/{uid} {\n      allow read, write: if request.auth != null && request.auth.uid == uid;\n    }\n    match /users/{uid}/lists/{listId} {\n      allow read, write: if request.auth != null && request.auth.uid == uid;\n    }\n  }\n}';
    if (Platform.OS === 'web') {
      try { (window as any)?.alert?.(msg); } catch {}
    } else {
      Alert.alert('权限不足', msg);
    }
  // 记录详细错误以便调试
  console.error('[CloudSync] Firestore permission error', err);
  };

  useEffect(() => {
    if (!user || !db) return;
    const uid = user.uid;
    const listsCol = collection(db, 'users', uid, 'lists');

    let unsub: (() => void) | undefined;

    (async () => {
      try {
        // 第一次：尝试拉取一个标记文档，判断云端是否已有内容
        const probeRef = doc(db, 'users', uid);
        const probeSnap = await getDoc(probeRef);
        // 如果用户根文档不存在，创建它
        if (!probeSnap.exists()) {
          await setDoc(probeRef, { createdAt: serverTimestamp() }, { merge: true });
        }
      } catch (e) {
        showPermError(e);
        return;
      }

      // 简化：拉取 lists 子集合的一个 onSnapshot 后再决定初始化策略
      unsub = onSnapshot(
        listsCol,
        async (snap) => {
          try {
            if (!bootstrapped.current) {
              bootstrapped.current = true;
              if (snap.empty) {
                // 云端为空 -> 上传本地列表
                await Promise.all(
                  lists.map((l) =>
                    setDoc(
                      doc(listsCol, l.id),
                      {
                        ...l,
                        _syncedAt: serverTimestamp(),
                      },
                      { merge: true }
                    )
                  )
                );
              } else {
                // 云端有数据 -> 用云覆盖本地（简单粗暴）
                clearAll();
                snap.forEach((d) => {
                  const data = d.data() as TravelList;
                  if (data && data.id) upsertList(data);
                });
              }
              lastCloudApplyTs.current = Date.now();
              return;
            }

            // 非首次：增量应用云端变化（这里只是覆盖式 upsert）
            snap.forEach((d) => {
              const data = d.data() as TravelList;
              if (data && data.id) upsertList(data);
            });
            lastCloudApplyTs.current = Date.now();
          } catch (e) {
            showPermError(e);
          }
        },
        (err) => {
          showPermError(err);
        }
      );
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [user, lists, upsertList, clearAll, removeList]);

  // 监听本地 lists 变化并上传到云（登录状态下）
  useEffect(() => {
    if (!user || !db) return;
    const uid = user.uid;
    const listsCol = collection(db, 'users', uid, 'lists');
    (async () => {
      try {
        // 如果刚从云端应用了更改，短时间内跳过一次上传，避免回声循环
        if (Date.now() - lastCloudApplyTs.current < 500) return;
        await Promise.all(
          lists.map((l) =>
            setDoc(
              doc(listsCol, l.id),
              {
                ...l,
                _syncedAt: serverTimestamp(),
              },
              { merge: true }
            )
          )
        );
      } catch (e) {
        showPermError(e);
      }
    })();
  }, [user, lists]);

  return <>{children}</>;
};
