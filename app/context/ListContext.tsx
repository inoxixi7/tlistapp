// 文件用途：
// - 维护旅行清单的本地状态与持久化（AsyncStorage），并提供 CRUD API。
// - 支持老版本数据格式的迁移；提供 upsert/remove/clearAll/getById。
// app/context/ListContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type TravelList = {
  id: string;
  listName: string;
  destination?: string;
  duration: number;
  adults: number;
  children: number;
  purpose?: string;
  originalParams: any;
  checkedItems: Record<string, boolean>;
  items: string[]; // 快照：用于计算完成进度
  categories?: Record<string, string[]>; // 分组：用于在页面按分类显示
  createdAt: number;
  updatedAt: number;
};

type Ctx = {
  lists: TravelList[];
  upsertList: (list: Omit<TravelList, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }) => void;
  removeList: (id: string) => void;
  clearAll: () => void;
  getById: (id: string) => TravelList | undefined;
};

const STORAGE_KEY_NEW = 'savedLists';
const STORAGE_KEY_OLD = 'savedList';

const ListContext = createContext<Ctx | null>(null);

export const ListProvider = ({ children }: { children: React.ReactNode }) => {
  const [lists, setLists] = useState<TravelList[]>([]);

  // 初期読み込み + 旧フォーマットからの移行
  useEffect(() => {
    (async () => {
      try {
        const jsonNew = await AsyncStorage.getItem(STORAGE_KEY_NEW);
        if (jsonNew) {
          setLists(JSON.parse(jsonNew));
          return;
        }
        const jsonOld = await AsyncStorage.getItem(STORAGE_KEY_OLD);
        if (jsonOld) {
          // 旧: 単一オブジェクト -> 新: 配列に包む
          const legacy = JSON.parse(jsonOld);
          const migrated: TravelList = {
            id: `legacy-${Date.now()}`,
            listName: legacy.listName || '旅行リスト',
            destination: legacy.destination,
            duration: legacy.duration || 0,
            adults: legacy.adults || 0,
            children: legacy.children || 0,
            purpose: legacy.purpose,
            originalParams: legacy.originalParams,
            checkedItems: legacy.checkedItems || {},
            items: Array.isArray(legacy.items) ? legacy.items : [],
            categories: legacy.categories && typeof legacy.categories === 'object'
              ? legacy.categories
              : (Array.isArray(legacy.items) ? { 'リスト': legacy.items } : undefined),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setLists([migrated]);
          await AsyncStorage.setItem(STORAGE_KEY_NEW, JSON.stringify([migrated]));
          await AsyncStorage.removeItem(STORAGE_KEY_OLD);
        }
      } catch (e) {
        console.warn('Failed to load saved lists', e);
      }
    })();
  }, []);

  const persist = async (next: TravelList[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_NEW, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to persist saved lists', e);
    }
  };

  const upsertList: Ctx['upsertList'] = useCallback((list) => {
    setLists((prev) => {
      const idx = prev.findIndex((l) => l.id === list.id);
      const now = Date.now();
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...list, updatedAt: now } as TravelList;
        persist(next);
        return next;
      } else {
        const newItem: TravelList = {
          ...list,
          id: list.id || `${now}`,
          createdAt: now,
          updatedAt: now,
        } as TravelList;
        const next = [newItem, ...prev];
        persist(next);
        return next;
      }
    });
  }, []);

  const removeList: Ctx['removeList'] = useCallback((id) => {
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setLists([]);
    persist([]);
  }, []);

  const getById: Ctx['getById'] = useCallback((id) => lists.find((l) => l.id === id), [lists]);

  const value = useMemo<Ctx>(() => ({ lists, upsertList, removeList, clearAll, getById }), [lists, upsertList, removeList, clearAll, getById]);

  return <ListContext.Provider value={value}>{children}</ListContext.Provider>;
};

export const useList = () => {
  const ctx = useContext(ListContext);
  if (!ctx) throw new Error('useList must be used within ListProvider');
  return ctx;
};