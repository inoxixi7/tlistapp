// 文件用途：
// - 在登录状态下，把本地清单与 Firestore 的 users/{uid}/lists 做基础同步（订阅+增量写入）。
// - 首次登录：云端为空则上载本地；云端有数据则覆盖本地。
// - 非首次：订阅云端变更并覆盖本地相同项；本地修改会合并写回云端。
// app/context/CloudSync.tsx
import { db } from '@/app/lib/firebase';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
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
  const { lists, upsertList, clearAll } = useList();
  const bootstrapped = useRef(false);
  const lastCloudApplyTs = useRef(0);
  const permErrorShown = useRef(false);
  const listsRef = useRef<TravelList[]>([]);
  const isApplyingFromCloud = useRef(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const upsertRef = useRef(upsertList);
  const clearAllRef = useRef(clearAll);

  useEffect(() => { upsertRef.current = upsertList; }, [upsertList]);
  useEffect(() => { clearAllRef.current = clearAll; }, [clearAll]);

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

  // 始终保留最新 lists，供订阅回调中使用，避免闭包捕获旧值
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

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

      // 为新的订阅重置引导标志
      bootstrapped.current = false;
  // 重置上一位用户残留的 prevIds，避免在首次 snapshot 前触发“本地缺失=云端删除”
  prevIdsRef.current = new Set();

      // 简化：拉取 lists 子集合的一个 onSnapshot 后再决定初始化策略
      unsub = onSnapshot(
        listsCol,
        async (snap) => {
          try {
            isApplyingFromCloud.current = true;
            if (!bootstrapped.current) {
              bootstrapped.current = true;
              if (snap.empty) {
                // 云端为空 -> 上传本地列表
                const currentLists = listsRef.current;
                await Promise.all(
                  currentLists.map((l) =>
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
                clearAllRef.current();
                snap.forEach((d) => {
                  const data = d.data() as TravelList;
                  if (data && data.id) upsertRef.current(data);
                });
              }
            } else {
              // 非首次：增量应用云端变化（这里只是覆盖式 upsert）
              snap.forEach((d) => {
                const data = d.data() as TravelList;
                if (data && data.id) upsertRef.current(data);
              });
            }
            lastCloudApplyTs.current = Date.now();
          } catch (e) {
            showPermError(e);
          } finally {
            isApplyingFromCloud.current = false;
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
  }, [user]);

  // 监听本地 lists 变化并上传到云（登录状态下）
  useEffect(() => {
    if (!user || !db) return;
  if (isApplyingFromCloud.current) return; // 避免处理云端驱动的本地更新
  // 首次引导（bootstrapped=false）期间禁止任何上传/删除，防止用“空本地”覆盖云端
  if (!bootstrapped.current) return;
    const uid = user.uid;
    const listsCol = collection(db, 'users', uid, 'lists');
    (async () => {
      try {
        const currentLists = listsRef.current;
        // 先处理删除：找出上一次存在但当前已不存在的 ID
        const prevIds = prevIdsRef.current;
        const currentIds = new Set(currentLists.map((l) => l.id));
        const removedIds: string[] = [];
        prevIds.forEach((id) => { if (!currentIds.has(id)) removedIds.push(id); });

        if (removedIds.length > 0) {
          await Promise.all(
            removedIds.map((id) => deleteDoc(doc(listsCol, id)).catch((e) => {
              console.warn('[CloudSync] delete cloud doc failed', id, e);
            }))
          );
        }

        const toUpload = currentLists.filter((l) => typeof l.updatedAt === 'number' && l.updatedAt > lastCloudApplyTs.current);
        if (toUpload.length === 0) return;
        await Promise.all(
          toUpload.map((l) =>
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
      } finally {
        // 更新 prevIds 快照
        prevIdsRef.current = new Set(listsRef.current.map((l) => l.id));
      }
    })();
  }, [user, lists.length]);

  return <>{children}</>;
};
