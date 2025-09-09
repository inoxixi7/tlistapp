// app/newlist.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// 导入 DateTimePicker 和 Picker
import { Picker } from '@react-native-picker/picker';
// 导入 useRouter
import { useRouter } from 'expo-router';

const DESTINATIONS = [
  '東京',
  '大阪',
  '京都',
  '北海道',
  '福岡',
  '沖縄',
];

const TRAVEL_PURPOSES = [
  '観光',
  'ショッピング',
  'グルメ',
  'ビジネス',
  '帰省',
  'レジャー',
];

export default function NewListScreen() {
  const router = useRouter(); // 使用 useRouter 钩子

  const [destination, setDestination] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [purpose, setPurpose] = useState('');
  const [listName, setListName] = useState('');

  // 日期输入框的受控字符串，避免点击/清空时将 Date 设为 Invalid
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => {
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const tryParseDate = (txt: string): Date | null => {
    const s = txt.trim();
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
  const [startDateInput, setStartDateInput] = useState(formatDate(new Date()));
  const [endDateInput, setEndDateInput] = useState(formatDate(new Date()));

  // 这个函数只在原生应用上被调用（当前 Web 输入使用，因此暂不使用）
  // const onDateChange = (_event: any, selectedDate?: Date) => {
  //   setShowDatePicker(false);
  //   if (selectedDate) {
  //     if (activeDateType === 'start') {
  //       setStartDate(selectedDate);
  //     } else {
  //       setEndDate(selectedDate);
  //     }
  //   }
  // };

  // 新增的保存处理函数
  // 校验函数：返回错误消息列表（日语）
  const getValidationErrors = (): string[] => {
    const errs: string[] = [];
    if (!listName.trim()) errs.push('リスト名を入力してください。');
    if (!destination) errs.push('目的地を選択してください。');
    if (!purpose) errs.push('旅行目的を選択してください。');
    const s = tryParseDate(startDateInput);
    const e = tryParseDate(endDateInput);
    if (!s) errs.push('出発日を正しく入力してください（YYYY-MM-DD）。');
    if (!e) errs.push('終了日を正しく入力してください（YYYY-MM-DD）。');
    if (s && e && e.getTime() < s.getTime()) errs.push('終了日は出発日以降の日付にしてください。');
    return errs;
  };

  // 校验：用于禁用保存按钮
  const isValidForm = getValidationErrors().length === 0;

  const handleSave = () => {
    const errs = getValidationErrors();
    if (errs.length > 0) return;
    // 使用 router.push() 导航并传递参数（此时已校验通过）
    const s = tryParseDate(startDateInput)!;
    const e = tryParseDate(endDateInput)!;
    router.push({
      pathname: '/recommendedlist', // 目标页面的路径名
      params: {
        destination,
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        adults,
        children,
        purpose,
        listName: listName.trim(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>新しいリスト</Text>

        <ScrollView contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {/* 清单名称 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>リスト名</Text>
            <TextInput
              style={styles.input}
              placeholder="例：日本旅行プラン"
              value={listName}
              onChangeText={(v) => setListName(v)}
            />
          </View>

          {/* 目的地选择 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>目的地</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={destination} onValueChange={(itemValue) => setDestination(itemValue)}>
                <Picker.Item label="目的地を選択" value="" />
                {DESTINATIONS.map((dest) => (
                  <Picker.Item key={dest} label={dest} value={dest} />
                ))}
              </Picker>
            </View>
          </View>

          {/* 出发日和结束日 */}
          <View style={styles.dateRow}>
            <View style={styles.dateContainer}>
              <Text style={styles.label}>出発日</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={startDateInput}
                onChangeText={(text) => setStartDateInput(text)}
              />
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.label}>終了日</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={endDateInput}
                onChangeText={(text) => setEndDateInput(text)}
              />
            </View>
          </View>

          {/* 人数选择 */}
          <View style={styles.rowBetween}>
            <Text style={styles.label}>人数</Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={styles.counterContainer}>
                <Text style={styles.counterLabel}>大人</Text>
                <Pressable style={[styles.counterButton, styles.counterBtnGhost]} onPress={() => setAdults((prev) => Math.max(0, prev - 1))}>
                  <Ionicons name="remove" size={18} color="#111827" />
                </Pressable>
                <Text style={styles.counterText}>{adults}</Text>
                <Pressable style={[styles.counterButton, styles.counterBtnPrimary]} onPress={() => setAdults((prev) => prev + 1)}>
                  <Ionicons name="add" size={18} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.counterContainer}>
                <Text style={styles.counterLabel}>子ども</Text>
                <Pressable style={[styles.counterButton, styles.counterBtnGhost]} onPress={() => setChildren((prev) => Math.max(0, prev - 1))}>
                  <Ionicons name="remove" size={18} color="#111827" />
                </Pressable>
                <Text style={styles.counterText}>{children}</Text>
                <Pressable style={[styles.counterButton, styles.counterBtnPrimary]} onPress={() => setChildren((prev) => prev + 1)}>
                  <Ionicons name="add" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* 旅行目的选择 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>旅行目的</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={purpose} onValueChange={(itemValue) => setPurpose(itemValue)}>
                <Picker.Item label="目的を選択" value="" />
                {TRAVEL_PURPOSES.map((p) => (
                  <Picker.Item key={p} label={p} value={p} />
                ))}
              </Picker>
            </View>
          </View>

          {/* 保存按钮 */}
          <Pressable
            style={[styles.btn, isValidForm ? styles.btnPrimary : styles.btnDisabled]}
            onPress={handleSave}
            disabled={!isValidForm}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.btnTextLight}>リストを保存</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    // backgroundColor: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12, color: '#1f2d3d' },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#374151',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e9f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    width: '100%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e5e9f0',
    borderRadius: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateContainer: {
    width: '48%',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(243, 244, 246, 1)',
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  counterLabel: {
    marginRight: 10,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnGhost: { backgroundColor: '#e5e7eb' },
  counterBtnPrimary: { backgroundColor: 'dodgerblue' },
  counterText: {
    fontSize: 18,
    marginHorizontal: 15,
  },
  btn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: { backgroundColor: 'dodgerblue' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnTextLight: { color: '#fff', fontWeight: '700' },
});