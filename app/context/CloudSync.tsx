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
  // 初始基线：首次 snapshot 建立后才允许执行删除逻辑
  const baselineEstablishedRef = useRef(false);
  const baselineRemoteIdsRef = useRef<Set<string>>(new Set());
  // 删除保护：基线后延迟一段时间才允许真正删除云端
  const allowDeletionRef = useRef(false);
  const deletionEnableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录每个 list 上次成功上传的 updatedAt，避免重复写入
  const lastUploadedMapRef = useRef<Map<string, number>>(new Map());
  // 节流定时器引用
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
                // 基线：云端无 -> 记录本地（可能为空）
                baselineRemoteIdsRef.current = new Set(currentLists.map((l) => l.id));
              } else {
                // 云端有数据 -> 用云覆盖本地（简单粗暴）
                clearAllRef.current();
                const remoteIds: string[] = [];
                snap.forEach((d) => {
                  const data = d.data() as TravelList;
                  if (data && data.id) {
                    remoteIds.push(data.id);
                    upsertRef.current(data);
                  }
                });
                baselineRemoteIdsRef.current = new Set(remoteIds);
              }
              baselineEstablishedRef.current = true; // 首次 snapshot 处理完毕
              // 基线后将 prevIds 设为当前（云端或本地上传后的）集合，避免被视为“删除”
              prevIdsRef.current = new Set(listsRef.current.map((l) => l.id));
              // 延迟启用删除（3 秒窗口避免用户刚进入时本地尚未合并完全）
              if (deletionEnableTimerRef.current) clearTimeout(deletionEnableTimerRef.current);
              allowDeletionRef.current = false;
              deletionEnableTimerRef.current = setTimeout(() => { allowDeletionRef.current = true; }, 3000);
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

  // 执行实际上传（差异 + 删除），被节流调度
  const performUpload = React.useCallback(async () => {
    if (!user || !db) return;
    if (isApplyingFromCloud.current) return;
    if (!bootstrapped.current) return;
    const uid = user.uid;
    const listsCol = collection(db, 'users', uid, 'lists');
    try {
      const currentLists = listsRef.current;
      const prevIds = prevIdsRef.current;
      const currentIds = new Set(currentLists.map((l) => l.id));
      const removedIds: string[] = [];
      // 仅在基线建立且初始远程不为空时允许删除，避免本地空初始态误删云端
  if (allowDeletionRef.current && baselineEstablishedRef.current && baselineRemoteIdsRef.current.size > 0) {
        prevIds.forEach((id) => { if (!currentIds.has(id)) removedIds.push(id); });
      }

      if (removedIds.length > 0) {
        await Promise.all(
          removedIds.map((id) => deleteDoc(doc(listsCol, id)).catch((e) => {
            console.warn('[CloudSync] delete cloud doc failed', id, e);
          }))
        );
        // 删除后亦需从 lastUploadedMap 中移除
        const map = lastUploadedMapRef.current;
        removedIds.forEach((id) => map.delete(id));
      }

      const map = lastUploadedMapRef.current;
      const toUpload: TravelList[] = [];
      for (const l of currentLists) {
        if (typeof l.updatedAt !== 'number') continue;
        const lastUploadedTs = map.get(l.id) || 0;
        // 仅当 updatedAt 大于上次成功上传（或云应用时间，以更严格标准）才上传
        if (l.updatedAt > lastUploadedTs && l.updatedAt > lastCloudApplyTs.current) {
          toUpload.push(l);
        }
      }
      if (toUpload.length > 0) {
        await Promise.all(
          toUpload.map((l) =>
            setDoc(
              doc(listsCol, l.id),
              { ...l, _syncedAt: serverTimestamp() },
              { merge: true }
            ).then(() => {
              lastUploadedMapRef.current.set(l.id, l.updatedAt);
            }).catch((e) => {
              console.warn('[CloudSync] setDoc failed', l.id, e);
            })
          )
        );
      }
    } catch (e) {
      showPermError(e);
    } finally {
      prevIdsRef.current = new Set(listsRef.current.map((l) => l.id));
    }
  }, [user]);

  // 监听本地 lists 变化并节流上传
  useEffect(() => {
    if (!user || !db) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    // 500ms 无进一步变更才执行上传
    debounceTimerRef.current = setTimeout(() => {
      performUpload();
    }, 500);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [user, lists, performUpload]);

  return <>{children}</>;
};
