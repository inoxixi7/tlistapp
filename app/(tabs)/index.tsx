// app/(tabs)/index.tsx
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useList } from '../context/ListContext';

export default function HomeScreen() {
  const { lists, removeList, upsertList } = useList();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string>('');

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
    Alert.alert('删除清单', `确定删除“${item.listName}”吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeList(id) },
    ]);
  };

  const startRename = (id: string) => {
    const item = lists.find((l) => l.id === id);
    if (!item) return;
    setEditingId(id);
    setNameDraft(item.listName || '旅行清单');
  };

  const cancelRename = () => {
    setEditingId(null);
    setNameDraft('');
  };

  const saveRename = (id: string) => {
    const item = lists.find((l) => l.id === id);
    if (!item) return;
    const newName = nameDraft.trim() || '旅行清单';
    upsertList({
      ...item,
      listName: newName,
      originalParams: { ...item.originalParams, listName: newName },
    });
    cancelRename();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的旅行清单</Text>
      {lists.length === 0 ? (
        <Text style={styles.placeholder}>还没有保存的清单，快去创建一个吧！</Text>
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
                    placeholder="输入新的清单名称"
                  />
                  <Pressable style={[styles.smallButton, styles.saveBtn]} onPress={() => saveRename(l.id)}>
                    <Text style={styles.smallButtonText}>保存</Text>
                  </Pressable>
                  <Pressable style={[styles.smallButton, styles.cancelBtn]} onPress={cancelRename}>
                    <Text style={styles.smallButtonText}>取消</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{l.listName || '旅行清单'}</Text>
                  <View style={styles.actionRow}>
                    <Pressable style={[styles.actionBtn, styles.renameBtn]} onPress={() => startRename(l.id)}>
                      <Text style={styles.actionText}>重命名</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleAskDelete(l.id)}>
                      <Text style={styles.actionText}>删除</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable onPress={() => handleEdit(l.id)}>
                <Text style={styles.cardInfo}>目的地: {l.destination || '未填写'}</Text>
                <Text style={styles.cardInfo}>人数: {l.adults}大, {l.children}小</Text>
                <Text style={styles.cardInfo}>天数: {l.duration}天</Text>
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
          <Text style={styles.createButtonText}>创建新清单</Text>
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