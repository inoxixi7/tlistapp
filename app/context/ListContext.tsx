// app/context/ListContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ListContext = createContext<any>(null);

export const ListProvider = ({ children }: { children: React.ReactNode }) => {
  const [savedList, setSavedList] = useState<any | null>(null);

  // 初期読み込み（アプリ再起動や Web リロード時の復元）
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem('savedList');
        if (json) {
          setSavedList(JSON.parse(json));
        }
      } catch (e) {
        // 失敗しても致命的ではないので握りつぶす
        console.warn('Failed to load saved list', e);
      }
    })();
  }, []);

  const persist = async (list: any | null) => {
    try {
      if (list) {
        await AsyncStorage.setItem('savedList', JSON.stringify(list));
      } else {
        await AsyncStorage.removeItem('savedList');
      }
    } catch (e) {
      console.warn('Failed to persist saved list', e);
    }
  };

  const saveList = (list: any) => {
    setSavedList(list);
    persist(list);
  };

  const clearList = () => {
    setSavedList(null);
    persist(null);
  };

  return (
    <ListContext.Provider value={{ savedList, saveList, clearList }}>
      {children}
    </ListContext.Provider>
  );
};

export const useList = () => useContext(ListContext);