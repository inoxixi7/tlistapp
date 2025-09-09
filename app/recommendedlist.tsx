// app/recommendedlist.tsx
import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// 导入 useLocalSearchParams 和 useRouter
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
// 导入 useList
import { db } from '@/app/lib/firebase';
import { Collapsible } from '@/components/Collapsible';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from './context/AuthContext';
import { useList } from './context/ListContext';

// 辅助函数：健壮解析日期（支持 YYYY-MM-DD / YYYY/MM/DD / ISO）
function parseDateSafe(s?: string): Date | null {
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
}

// 辅助函数，用于计算旅行天数（无效输入返回 0）
function getDuration(startDate?: string, endDate?: string): number {
  const start = parseDateSafe(startDate);
  const end = parseDateSafe(endDate);
  if (!start || !end) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Number.isFinite(diffDays) ? diffDays : 0;
}

// 已改为直接显示编辑中的输入值，保留解析函数供校验使用


// 固定分类模板：可按需微调
const CATEGORY_TEMPLATE: Record<string, string[]> = {
  証件: ['パスポート/ビザ', '運転免許証', '現金/クレジットカード'],
  行程・チケット: ['航空券/乗車券', 'ホテル予約確認'],
  洗面用具: ['歯ブラシ・歯磨き粉', '洗顔料', 'タオル', 'カミソリ', 'スキンケア'],
  衣類: ['着替え', '下着・靴下', 'アウター', '靴'],
  電子機器: ['スマホ・充電器', 'カメラ', 'モバイルバッテリー', '変換プラグ', 'イヤホン'],
  医薬品: ['常備薬', '絆創膏', '風邪薬', '胃腸薬'],
  その他: ['折りたたみ傘', '水筒', 'サングラス']
};

export default function RecommendedListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { upsertList, getById } = useList(); // 使用 useList 钩子
  const { user } = useAuth();

  const { id, destination, startDate, endDate, adults, children, purpose, listName, checkedItems: incomingChecked } = params as Record<string, string | string[]>;

  // Normalize possible string[] from URL params to string
  const norm = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) as string | undefined;
  const nId = norm(id);
  const nDestination = norm(destination);
  const nStartDate = norm(startDate);
  const nEndDate = norm(endDate);
  const nPurpose = norm(purpose);
  const nListName = norm(listName) || '日本旅行プラン';

  const parsedAdults = Number(norm(adults)) || 0;
  const parsedChildren = Number(norm(children)) || 0;

  // 编辑用常量与状态
  const TRAVEL_PURPOSES = ['観光', 'ショッピング', 'グルメ', 'ビジネス', '帰省', 'レジャー'];
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  // 初始化为当前值（日期使用 YYYY-MM-DD 文本）
  const [editAdults, setEditAdults] = useState<number>(parsedAdults);
  const [editChildren, setEditChildren] = useState<number>(parsedChildren);
  const [editStartDateInput, setEditStartDateInput] = useState<string>(() => {
    const d = parseDateSafe(nStartDate);
    return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : '';
  });
  const [editEndDateInput, setEditEndDateInput] = useState<string>(() => {
    const d = parseDateSafe(nEndDate);
    return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : '';
  });
  const [editPurpose, setEditPurpose] = useState<string>(nPurpose || '');
  const [showEdit, setShowEdit] = useState(false);

  const getValidationErrors = React.useCallback((): string[] => {
    const errs: string[] = [];
    const s = parseDateSafe(editStartDateInput);
    const e = parseDateSafe(editEndDateInput);
    if (!s) errs.push('出発日を正しく入力してください（YYYY-MM-DD）。');
    if (!e) errs.push('終了日を正しく入力してください（YYYY-MM-DD）。');
    if (s && e && e.getTime() < s.getTime()) errs.push('終了日は出発日以降の日付にしてください。');
    if (!editPurpose) errs.push('旅行目的を選択してください。');
    if (editAdults < 0 || editChildren < 0) errs.push('人数は0以上にしてください。');
    return errs;
  }, [editStartDateInput, editEndDateInput, editPurpose, editAdults, editChildren]);

  type Section = { key: string; title: string; items: string[] };

  const deriveSections = useCallback(
    (snapshot?: Record<string, string[]> | string[]): Section[] => {
      // 优先使用 categories 快照；否则从模板生成
      let map: Record<string, string[]>;
      if (snapshot && !Array.isArray(snapshot)) {
        map = snapshot as Record<string, string[]>;
      } else {
    // 从旧 items[] 回退：将未知项放入“その他”
        const fallbacks: Record<string, string[]> = JSON.parse(JSON.stringify(CATEGORY_TEMPLATE));
        const items = (Array.isArray(snapshot) ? snapshot : []) as string[];
        const templateAll = new Set(Object.values(CATEGORY_TEMPLATE).flat());
        for (const it of items) {
          if (!templateAll.has(it)) {
      if (!fallbacks['その他']) fallbacks['その他'] = [];
      if (!fallbacks['その他'].includes(it)) fallbacks['その他'].push(it);
          }
        }
        map = fallbacks;
      }
      return Object.entries(map).map(([k, arr]) => ({ key: k, title: k, items: arr }));
    },
    []
  );

  const [sections, setSections] = useState<Section[]>(() => deriveSections());
  const [newItemText, setNewItemText] = useState('');

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // 从已保存的清单进入编辑时：优先按 id 载入已保存的分组，再合并勾选状态
  useEffect(() => {
    if (nId) {
      const existing = getById(nId);
      if (existing) {
        setSections(deriveSections(existing.categories || existing.items));
        let merged: Record<string, boolean> = existing.checkedItems || {};
        if (incomingChecked) {
          try {
            const parsed = JSON.parse(Array.isArray(incomingChecked) ? incomingChecked[0] : incomingChecked);
            if (parsed && typeof parsed === 'object') {
              merged = { ...merged, ...parsed };
            }
          } catch {}
        }
        setCheckedItems(merged);
        return;
      }
      // 若找不到 existing，则回退到仅解析传入的勾选状态
      if (incomingChecked) {
        try {
          const parsed = JSON.parse(Array.isArray(incomingChecked) ? incomingChecked[0] : incomingChecked);
          if (parsed && typeof parsed === 'object') setCheckedItems(parsed);
        } catch {}
      }
      return;
    }
    // 新建场景但携带了勾选状态（不常见）：也予以恢复
    if (incomingChecked) {
      try {
        const parsed = JSON.parse(Array.isArray(incomingChecked) ? incomingChecked[0] : incomingChecked);
        if (parsed && typeof parsed === 'object') setCheckedItems(parsed);
      } catch {}
    }
  }, [incomingChecked, nId, getById, deriveSections]);

  const handleToggleCheck = (item: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };
  
  const handleSave = useCallback(async () => {
    // 校验编辑项
    const errs = getValidationErrors();
    if (errs.length > 0) {
      const message = errs.join('\n');
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && (window as any).alert) (window as any).alert(message);
      } else {
        Alert.alert('入力エラー', message);
      }
      return;
    }
    const allItems = sections.flatMap((s) => s.items);
    const categories = sections.reduce<Record<string, string[]>>((acc, s) => {
      acc[s.title] = s.items;
      return acc;
    }, {});
    // 准备要传递回 home 页面的数据（多清单支持）
    const lid = nId || `${Date.now()}`;
    const sDate = parseDateSafe(editStartDateInput)!;
    const eDate = parseDateSafe(editEndDateInput)!;
    const startIso = sDate.toISOString();
    const endIso = eDate.toISOString();
    const originalParams = {
      id: lid,
      destination: nDestination,
      startDate: startIso,
      endDate: endIso,
      adults: String(editAdults),
      children: String(editChildren),
      purpose: editPurpose,
      listName: nListName,
    };

    const listSummary = {
      id: lid,
      listName: nListName,
      destination: nDestination,
      duration: getDuration(startIso, endIso),
      adults: editAdults,
      children: editChildren,
      purpose: editPurpose,
      originalParams,
      checkedItems,
  items: allItems,
  categories,
    };

    // 先更新本地
    upsertList(listSummary);

    // 同步到云端（即刻写入）
    try {
      if (user && db) {
        const now = Date.now();
        const existing = nId ? getById(nId) : undefined;
        const toUpload = {
          ...listSummary,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          _syncedAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', user.uid, 'lists', lid), toUpload, { merge: true });
      }
    } catch (e) {
      console.warn('[recommendedlist] save to cloud failed', e);
      // 静默失败，不阻断返回
    }

    router.back();
    // 实际的参数传递，需要通过 context 或全局状态管理
    // router.setParams({ savedList: listSummary });
    // 由于 Expo Router 的 router.back() 不支持直接传参，我们可以在 home 页面监听导航事件或使用全局状态。
    // 为了简单起见，我们暂时先模拟一个返回操作，稍后通过全局状态来完善。
    // 在实际项目中，可以使用 Jotai, Zustand 或 Redux 来存储状态。
    // 这里我们先不处理传递逻辑，仅返回。
  }, [sections, nId, nDestination, nListName, checkedItems, upsertList, router, editAdults, editChildren, editEndDateInput, editPurpose, editStartDateInput, getValidationErrors, getById, user]);

  // 在导航栏右侧添加一个保存按钮，并根据 listName 动态设置标题
  useLayoutEffect(() => {
    navigation.setOptions({
      title: nListName || 'おすすめリスト',
      headerRight: () => (
        <Pressable onPress={handleSave}>
          <Text style={styles.headerButton}>保存</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleSave, nListName]);

  return (
    <ScrollView style={styles.container}>
    {/* <Text style={styles.header}>あなたへのおすすめ旅行リスト</Text> */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeaderRow}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setShowEdit((v) => !v)}>
            <Text style={styles.editLink}>{showEdit ? '閉じる' : '編集'}</Text>
          </Pressable>
        </View>
        <Text style={styles.summaryText}>
      <Text style={styles.label}>人数:</Text>
      大人{editAdults}名・子ども{editChildren}名
        </Text>
        <Text style={styles.summaryText}>
      <Text style={styles.label}>期間:</Text>
      {editStartDateInput || '未入力'} 〜 {editEndDateInput || '未入力'}
        </Text>
        <Text style={styles.summaryText}>
      <Text style={styles.label}>旅行目的:</Text>
      {editPurpose || '未選択'}
        </Text>

        {showEdit && (
          <View style={styles.editPanel}>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>大人</Text>
              <View style={styles.counterGroup}>
                <Pressable style={styles.counterBtn} onPress={() => setEditAdults((v) => Math.max(0, v - 1))}>
                  <Text style={styles.counterBtnText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>{editAdults}</Text>
                <Pressable style={styles.counterBtn} onPress={() => setEditAdults((v) => v + 1)}>
                  <Text style={styles.counterBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>子ども</Text>
              <View style={styles.counterGroup}>
                <Pressable style={styles.counterBtn} onPress={() => setEditChildren((v) => Math.max(0, v - 1))}>
                  <Text style={styles.counterBtnText}>-</Text>
                </Pressable>
                <Text style={styles.counterValue}>{editChildren}</Text>
                <Pressable style={styles.counterBtn} onPress={() => setEditChildren((v) => v + 1)}>
                  <Text style={styles.counterBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>出発日</Text>
              <TextInput
                style={styles.editInput}
                placeholder="YYYY-MM-DD"
                value={editStartDateInput}
                onChangeText={setEditStartDateInput}
              />
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>終了日</Text>
              <TextInput
                style={styles.editInput}
                placeholder="YYYY-MM-DD"
                value={editEndDateInput}
                onChangeText={setEditEndDateInput}
              />
            </View>
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>旅行目的</Text>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={editPurpose} onValueChange={(v) => setEditPurpose(String(v))}>
                  <Picker.Item label="選択" value="" />
                  {TRAVEL_PURPOSES.map((p) => (
                    <Picker.Item key={p} label={p} value={p} />
                  ))}
                </Picker>
              </View>
            </View>
            <Text style={styles.editHint}>右上の「保存」を押すと変更が適用されます。</Text>
          </View>
        )}
      </View>
      <View style={styles.listContainer}>
        {sections.map((sec, idx) => {
          const total = sec.items.length;
          const done = sec.items.reduce((acc, it) => acc + (checkedItems[it] ? 1 : 0), 0);
          const title = `${sec.title}（${done}/${total}）`;
          return (
            <View key={sec.key} style={styles.section}>
              <Collapsible title={title} defaultOpen={idx === 0}>
                {sec.items.map((item) => (
                  <View key={item} style={styles.listItemRow}>
                    <Pressable style={styles.listItem} onPress={() => handleToggleCheck(item)}>
                      <View style={[styles.checkbox, checkedItems[item] && styles.checkedCheckbox]}>
                        {checkedItems[item] && <Text style={styles.checkedText}>✓</Text>}
                      </View>
                      <Text style={styles.itemText}>{item}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => {
                        setSections((prev) =>
                          prev.map((s) =>
                            s.key === sec.key ? { ...s, items: s.items.filter((it) => it !== item) } : s
                          )
                        );
                        setCheckedItems(({ [item]: _omit, ...rest }) => rest as any);
                      }}
                    >
                      <Text style={styles.deleteBtnText}>削除</Text>
                    </Pressable>
                  </View>
                ))}
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.addInput}
                    placeholder={`「${sec.title}」にカスタム項目を追加`}
                    value={newItemText}
                    onChangeText={setNewItemText}
                  />
                  <Pressable
                    style={styles.addButton}
                    onPress={() => {
                      const name = newItemText.trim();
                      if (!name) return;
                      const exists = sections.some((s) => s.items.includes(name));
                      if (exists) {
                        setNewItemText('');
                        return;
                      }
                      setSections((prev) =>
                        prev.map((s) => (s.key === sec.key ? { ...s, items: [...s.items, name] } : s))
                      );
                      setCheckedItems((prev) => ({ ...prev, [name]: false }));
                      setNewItemText('');
                    }}
                  >
                    <Text style={styles.addButtonText}>追加</Text>
                  </Pressable>
                </View>
              </Collapsible>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  headerButton: {
    color: 'dodgerblue',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: 'dodgerblue',
    borderColor: 'dodgerblue',
  },
  checkedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemText: {
    fontSize: 16,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
  },
  addButton: {
    backgroundColor: 'dodgerblue',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  // ===== Edit panel styles =====
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  editLink: {
    color: 'dodgerblue',
    fontWeight: 'bold',
    fontSize: 14,
  },
  editPanel: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '600',
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
  },
  pickerWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
  },
  editHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#ffe0e0',
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteBtnText: {
    color: '#c00',
    fontSize: 12,
  },
});