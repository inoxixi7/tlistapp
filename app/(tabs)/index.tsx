// app/(tabs)/index.tsx
import { db } from '@/app/lib/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useList } from '../context/ListContext';

export default function HomeScreen() {
  const { lists, removeList, upsertList, clearAll } = useList();
  const { user } = useAuth();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string>('');
  const clearAllRef = React.useRef(clearAll);
  const upsertRef = React.useRef(upsertList);
  const listsRef = React.useRef(lists);
  React.useEffect(() => { clearAllRef.current = clearAll; }, [clearAll]);
  React.useEffect(() => { upsertRef.current = upsertList; }, [upsertList]);
  React.useEffect(() => { listsRef.current = lists; }, [lists]);

  // 回到首页时主动从云端拉取，确保显示最新
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          if (!user || !db) return;
          const uid = user.uid;
          const snap = await getDocs(collection(db, 'users', uid, 'lists'));
          if (!active) return;
          // 合并：仅当云端文档较新或本地不存在时覆盖，避免清空本地导致竞态
          const localMap = new Map<string, any>(listsRef.current.map((it: any) => [it.id, it]));
          snap.forEach((d) => {
            const cloud = d.data() as any;
            if (!cloud || !cloud.id) return;
            const local = localMap.get(cloud.id);
            const cloudTs = typeof cloud.updatedAt === 'number' ? cloud.updatedAt : 0;
            const localTs = local && typeof local.updatedAt === 'number' ? local.updatedAt : -1;
            if (!local || cloudTs >= localTs) {
              upsertRef.current(cloud);
            }
          });
        } catch (e) {
          // 静默失败，避免打扰；CloudSync 仍在后台监听
          console.warn('[Home] refresh from cloud failed', e);
        }
      })();
      return () => { active = false; };
    }, [user])
  );

  const handleEdit = (id: string) => {
    const item = lists.find((l) => l.id === id);
    if (!item) return;
    router.push({
      pathname: '/recommendedlist',
      params: {
        ...item.originalParams,
        id: item.id,
        checkedItems: JSON.stringify(item.checkedItems || {}),
      },
    });
  };

  const handleAskDelete = (id: string) => {
    const item = lists.find((l) => l.id === id);
    if (!item) return;
    // Web 使用原生 confirm，原生端使用 Alert.alert
    if (Platform.OS === 'web') {
      const ok = typeof globalThis !== 'undefined' && (globalThis as any).confirm
        ? (globalThis as any).confirm(`「${item.listName}」を削除しますか？`)
        : false;
      if (ok) {
        if (user && db) {
          // 先删云端，再删本地，避免回流
          (async () => {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'lists', id));
            } catch (e) {
              console.warn('[Home] delete cloud doc failed', e);
            } finally {
              removeList(id);
            }
          })();
        } else {
          removeList(id);
        }
      }
      return;
    }
    Alert.alert('リストを削除', `「${item.listName}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          if (user && db) {
            (async () => {
              try {
                await deleteDoc(doc(db, 'users', user.uid, 'lists', id));
              } catch (e) {
                console.warn('[Home] delete cloud doc failed', e);
              } finally {
                removeList(id);
              }
            })();
          } else {
            removeList(id);
          }
        },
      },
    ]);
  };

  const startRename = (id: string) => {
    const item = lists.find((l) => l.id === id);
    if (!item) return;
    setEditingId(id);
  setNameDraft(item.listName || '旅行リスト');
  };

  const cancelRename = () => {
    setEditingId(null);
    setNameDraft('');
  };

  const saveRename = (id: string) => {
    const item = lists.find((l) => l.id === id);
    if (!item) return;
  const newName = nameDraft.trim() || '旅行リスト';
    upsertList({
      ...item,
      listName: newName,
      originalParams: { ...item.originalParams, listName: newName },
    });
    cancelRename();
  };

  // 安全解析与 YYYY-MM-DD 格式化
  const parseDateSafe = (s?: string): Date | null => {
    if (!s) return null;
    const m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const da = parseInt(m[3], 10);
      const d = new Date(y, mo, da);
      if (d.getFullYear() === y && d.getMonth() === mo && d.getDate() === da) return d;
      return null;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatDateYmd = (s?: string) => {
    const d = parseDateSafe(s);
    if (!d) return '未入力';
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>マイ旅行リスト</Text>
      {lists.length === 0 ? (
        <Text style={styles.placeholder}>保存されたリストはまだありません。<br />まずは作成してみましょう！</Text>
      ) : (
        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
          {lists.map((l) => (
            <View key={l.id} style={styles.listCard}>
              {editingId === l.id ? (
                <View style={styles.renameRow}>
                  <TextInput
                    style={styles.renameInput}
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="新しいリスト名を入力"
                  />
                  <Pressable style={[styles.smallButton, styles.saveBtn]} onPress={() => saveRename(l.id)}>
                    <Text style={styles.smallButtonText}>保存</Text>
                  </Pressable>
                  <Pressable style={[styles.smallButton, styles.cancelBtn]} onPress={cancelRename}>
                    <Text style={styles.smallButtonText}>キャンセル</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{l.listName || '旅行リスト'}</Text>
                  <View style={styles.actionRow}>
                    <Pressable style={[styles.actionBtn, styles.renameBtn]} onPress={() => startRename(l.id)}>
                      <Text style={styles.actionText}>名前を変更</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleAskDelete(l.id)}>
                      <Text style={styles.actionText}>削除</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable onPress={() => handleEdit(l.id)}>
                <Text style={styles.cardInfo}>目的地: {l.destination || '未入力'}</Text>
                <Text style={styles.cardInfo}>人数: 大人{l.adults}名・子ども{l.children}名</Text>
                <Text style={styles.cardInfo}>期間: {formatDateYmd(l.originalParams?.startDate)} 〜 {formatDateYmd(l.originalParams?.endDate)}</Text>
                {/* 进度条 */}
                <View style={styles.progressRow}>
                  {(() => {
                    const total = Array.isArray(l.items) ? l.items.length : 0;
                    const done = l.checkedItems ? Object.values(l.checkedItems).filter(Boolean).length : 0;
                    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{percent}%</Text>
                      </>
                    );
                  })()}
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

    <Link href="/newlist" asChild>
        <Pressable style={styles.createButton}>
      <Text style={styles.createButtonText}>新しいリストを作成</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  renameBtn: {
    backgroundColor: '#e0f2ff',
  },
  deleteBtn: {
    backgroundColor: '#ffe0e0',
  },
  actionText: {
    color: '#333',
    fontSize: 14,
  },
  cardInfo: {
    fontSize: 16,
    color: '#555',
  },
  placeholder: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  renameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
  },
  smallButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: 'dodgerblue',
  },
  cancelBtn: {
    backgroundColor: '#aaa',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  progressRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'dodgerblue',
  },
  progressText: {
    width: 50,
    textAlign: 'right',
    color: '#333',
  },
  createButton: {
    backgroundColor: 'dodgerblue',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});