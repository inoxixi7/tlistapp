// app/recommendedlist.tsx
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// 导入 useLocalSearchParams 和 useRouter
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
// 导入 useList
import { Collapsible } from '@/components/Collapsible';
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
  const duration = getDuration(nStartDate, nEndDate);

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
  
  const handleSave = useCallback(() => {
    const allItems = sections.flatMap((s) => s.items);
    const categories = sections.reduce<Record<string, string[]>>((acc, s) => {
      acc[s.title] = s.items;
      return acc;
    }, {});
    // 准备要传递回 home 页面的数据（多清单支持）
    const lid = nId || `${Date.now()}`;
    const originalParams = {
      id: lid,
      destination: nDestination,
      startDate: nStartDate,
      endDate: nEndDate,
      adults: String(parsedAdults),
      children: String(parsedChildren),
      purpose: nPurpose,
      listName: nListName,
    };

    const listSummary = {
      id: lid,
      listName: nListName,
      destination: nDestination,
      duration: duration,
      adults: parsedAdults,
      children: parsedChildren,
      purpose: nPurpose,
      originalParams,
      checkedItems,
  items: allItems,
  categories,
    };

    upsertList(listSummary);
    router.replace('/');
    // 实际的参数传递，需要通过 context 或全局状态管理
    // router.setParams({ savedList: listSummary });
    // 由于 Expo Router 的 router.back() 不支持直接传参，我们可以在 home 页面监听导航事件或使用全局状态。
    // 为了简单起见，我们暂时先模拟一个返回操作，稍后通过全局状态来完善。
    // 在实际项目中，可以使用 Jotai, Zustand 或 Redux 来存储状态。
    // 这里我们先不处理传递逻辑，仅返回。
  }, [sections, nId, nDestination, nStartDate, nEndDate, parsedAdults, parsedChildren, nPurpose, nListName, duration, checkedItems, upsertList, router]);

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
    <Text style={styles.header}>あなたへのおすすめ旅行リスト</Text>
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
      <Text style={styles.label}>人数:</Text>
      大人{parsedAdults}名・子ども{parsedChildren}名
        </Text>
        <Text style={styles.summaryText}>
      <Text style={styles.label}>日数:</Text>
      {duration}日
        </Text>
        <Text style={styles.summaryText}>
      <Text style={styles.label}>旅行目的:</Text>
      {nPurpose || '未選択'}
        </Text>
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
                      <Text style={styles.deleteBtnText}>删除</Text>
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