// app/(tabs)/index.tsx
import { db } from '@/app/lib/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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

  // --- Weather integration ---
  // 简单映射：如果目的地包含特定关键词，映射到 Japan 気象庁 office code。
  // 可根据需要扩展成一个更完整的表或调用 /api/cities/search。
  const officeCodeForDestination = (dest?: string): string | null => {
    if (!dest) return null;
    const d = dest.toLowerCase();
  if (d.includes('東京') || d.includes('tokyo') || d.includes('東京都')) return '130000';
  if (d.includes('大阪') || d.includes('osaka')) return '270000';
  if (d.includes('名古屋') || d.includes('nagoya')) return '230000';
    if (d.includes('札幌') || d.includes('sapporo') || d.includes('北海道')) return '016000';
  if (d.includes('福岡') || d.includes('fukuoka')) return '400000';
    if (d.includes('京都') || d.includes('kyoto')) return '260000';
    if (d.includes('沖縄') || d.includes('okinawa')) return '471000';
    return null; // 未匹配
  };

  const weatherEmoji = (telop?: string): string => {
    if (!telop || typeof telop !== 'string') return '';
    const t = telop.replace(/\s+/g, '');
    // 优先级从强天气到基本天气
    if (/雷/.test(t)) return '⛈️';
    if (/猛暑|熱/.test(t)) return '🥵';
    if (/雪/.test(t)) return '❄️';
    if (/雨/.test(t)) return '🌧️';
    if (/晴/.test(t)) return '☀️';
    if (/くもり|曇/.test(t)) return '☁️';
    return '🌤️';
  };

  // 天气缓存：按 listId 存储；添加时间戳和 officeCode 便于调试与跨卡片共享
  type WeatherEntry = { loading: boolean; forecasts?: any[]; error?: string; fetchedAt?: number; officeCode?: string };
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherEntry>>({});
  const weatherRef = React.useRef(weatherMap);
  useEffect(() => { weatherRef.current = weatherMap; }, [weatherMap]);

  // 将多个 list 按 office code 分组，一次请求复用，避免仅首条被触发的问题
  useEffect(() => {
    if (!lists.length) return;
    const now = Date.now();
    const CACHE_TTL_MS_LOCAL = 30 * 60 * 1000; // 30 分钟
    const codeGroups: Record<string, string[]> = {}; // officeCode -> listIds
    const toInit: Record<string, WeatherEntry> = {};
    lists.forEach((l) => {
      const code = officeCodeForDestination(l.destination);
      if (!code) return;
      const existing = weatherRef.current[l.id];
  if (existing && existing.fetchedAt && (now - existing.fetchedAt) < CACHE_TTL_MS_LOCAL && (existing.forecasts || existing.error)) {
        // 仍然有效，不刷新
        return;
      }
      if (!codeGroups[code]) codeGroups[code] = [];
      codeGroups[code].push(l.id);
      if (!existing || !existing.loading) {
        toInit[l.id] = { loading: true, officeCode: code };
      }
    });
    if (Object.keys(codeGroups).length === 0) return;
    if (Object.keys(toInit).length) {
      setWeatherMap((prev) => ({ ...prev, ...toInit }));
    }
    Object.entries(codeGroups).forEach(([code, listIds]) => {
      fetch(`https://weatherapi-92so.onrender.com/api/forecast/office/${code}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('weather_http');
          const data = await res.json();
          const forecasts: any[] = Array.isArray(data?.forecasts) ? data.forecasts : [];
          setWeatherMap((prev) => {
            const next = { ...prev };
            listIds.forEach((id) => {
              next[id] = { loading: false, forecasts, fetchedAt: Date.now(), officeCode: code };
            });
            return next;
          });
        })
        .catch(() => {
          setWeatherMap((prev) => {
            const next = { ...prev };
            listIds.forEach((id) => {
              next[id] = { loading: false, error: '取得失敗', fetchedAt: Date.now(), officeCode: code };
            });
            return next;
          });
        });
    });
  }, [lists]);

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>マイ旅行リスト</Text> */}
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
                <Text style={styles.cardInfo}>
                  目的地: {l.destination || '未入力'}
                  {(() => {
                    if (!l.destination) return null;
                    const w = weatherMap[l.id];
                    if (!w) return <Text style={styles.weatherText}> 天気:取得中…</Text>;
                    if (w.loading) return <Text style={styles.weatherText}> 天気:取得中…</Text>;
                    if (w.error) return <Text style={[styles.weatherText, { color: '#d00' }]}> 天気:取得失敗</Text>;
                    if (!Array.isArray(w.forecasts) || !w.forecasts.length) {
                      return <Text style={styles.weatherText}> 天気:データなし</Text>;
                    }
                    // 行程第一天（多来源回退）
                    const rawStart = l.originalParams?.startDate || (l as any).startDate || (l as any).tripStart;
                    // 允许包含 年/月/日 等字符，提取数字
                    let startDateStr = formatDateYmd(rawStart);
                    if (startDateStr === '未输入' && typeof rawStart === 'string') {
                      const m = rawStart.match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);
                      if (m) {
                        const y = m[1];
                        const mo = m[2].padStart(2, '0');
                        const da = m[3].padStart(2, '0');
                        startDateStr = `${y}-${mo}-${da}`;
                      }
                    }
                    if (!startDateStr || startDateStr === '未入力') return null;
                    // 取 forecasts 中 date 与 startDateStr 匹配的条目（比较 YYYY-MM-DD）
                    const startDateObj = parseDateSafe(startDateStr);
                    let entry = w.forecasts.find((f: any) => typeof f?.date === 'string' && f.date.slice(0, 10) === startDateStr);
                    // 若没有精确匹配，选择与 startDate 天数差最小的一条（绝对差 <=1 天）
                    if (!entry && startDateObj) {
                      const candidates = w.forecasts
                        .map((f: any) => {
                          if (typeof f?.date !== 'string') return null;
                          const d = new Date(f.date);
                          if (isNaN(d.getTime())) return null;
                          const diffDays = Math.round((d.getTime() - startDateObj.getTime()) / 86400000);
                          return { f, diff: Math.abs(diffDays) };
                        })
                        .filter(Boolean)
                        .sort((a: any, b: any) => a.diff - b.diff);
                      if (candidates.length && candidates[0]!.diff <= 1) entry = candidates[0]!.f;
                    }
                    // 若未匹配且 startDate 是今天，则回退第一条（部分接口今日第一条 date 可能不含 00:00）
                    if (!entry) {
                      const now = new Date();
                      const pad2 = (n: number) => n.toString().padStart(2, '0');
                      const todayYmd = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
                      if (startDateStr === todayYmd) entry = w.forecasts[0];
                    }
                    if (!entry) return null; // 无该日气象信息
                    const telop: string | undefined = entry?.telop;
                    // 宽松解析温度：允许 null / '--' / 数字 / 字符串数字
                    const normVal = (v: any) => {
                      if (v == null) return undefined;
                      if (typeof v === 'object' && 'celsius' in v) return normVal((v as any).celsius);
                      if (typeof v === 'string') {
                        if (v.trim() === '' || v === '--' || v.toLowerCase() === 'null') return undefined;
                        const n = Number(v);
                        return isFinite(n) ? n : undefined;
                      }
                      if (typeof v === 'number' && isFinite(v)) return v;
                      return undefined;
                    };
                    let minC = normVal(entry?.temperature?.min);
                    let maxC = normVal(entry?.temperature?.max);
                    if ((minC === undefined && maxC === undefined) && Array.isArray(w.forecasts)) {
                      const alt = w.forecasts.find((f: any) => {
                        if (f === entry) return false;
                        return normVal(f?.temperature?.min) !== undefined || normVal(f?.temperature?.max) !== undefined;
                      });
                      if (alt) {
                        minC = normVal(alt?.temperature?.min);
                        maxC = normVal(alt?.temperature?.max);
                      }
                    }
                    const cor = entry?.chanceOfRain || {};
                    const nums = Object.values(cor)
                      .filter((v: any) => typeof v === 'string' && v !== '--')
                      .map((s: any) => parseInt(s, 10))
                      .filter((n: any) => !isNaN(n));
                    const rain = nums.length ? Math.max(...nums) : null;
                    if (!telop && minC == null && maxC == null && rain == null) {
                      return <Text style={styles.weatherText}> 天気:情報なし</Text>;
                    }
                    const parts: string[] = [];
                    if (telop) {
                      // 去除半角/全角空格以紧凑显示（例如 “くもり　時々　雨” -> “くもり時々雨”）
                      const collapsed = telop.replace(/[\s\u3000]+/g, '');
                      const display = `${collapsed.slice(0, 8)}${collapsed.length > 8 ? '…' : ''}`;
                      parts.push(`${weatherEmoji(telop)}${display}`);
                    }
                    if (minC === undefined && maxC === undefined) {
                      parts.push('気温:--');
                    } else if (minC !== undefined && maxC !== undefined) {
                      parts.push(`気温:${minC}~${maxC}°C`);
                    } else if (maxC !== undefined) {
                      parts.push(`最高気温:${maxC}°C`);
                    } else if (minC !== undefined) {
                      parts.push(`最低気温:${minC}°C`);
                    }
                    if (rain != null) parts.push(`降水:${rain}%`);
                    if (!parts.length) return null;
                    return <Text style={styles.weatherText}> {parts.join(' / ')}</Text>;
                  })()}
                </Text>
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
    borderRadius: 20,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weatherText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8, // 与目的地文字保持间距
  },
});