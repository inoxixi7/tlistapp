// app/newlist.tsx
import React, { useState } from 'react';
import {
  Button,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
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
  const handleSave = () => {
    // 使用 router.push() 导航并传递参数
    router.push({
      pathname: '/recommendedlist', // 目标页面的路径名
      params: {
        destination,
        // 使用 ISO 字符串；若无效则使用输入框 YYYY-MM-DD
        startDate: isNaN(startDate.getTime()) ? startDateInput : startDate.toISOString(),
        endDate: isNaN(endDate.getTime()) ? endDateInput : endDate.toISOString(),
        adults,
        children,
          purpose,
          listName,
      },
    });
  };

  return (
    <View style={styles.container}>
  <Text style={styles.header}>新しいリスト</Text>

      {/* 清单名称 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>リスト名</Text>
          <TextInput
            style={styles.input}
            placeholder="例：日本旅行プラン"
            value={listName}
            onChangeText={setListName}
          />
      </View>

      {/* 目的地选择 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>目的地</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={destination}
            onValueChange={(itemValue) => setDestination(itemValue)}>
            <Picker.Item label="目的地を選択" value="" />
            {DESTINATIONS.map((dest) => (
              <Picker.Item key={dest} label={dest} value={dest} />
            ))}
          </Picker>
        </View>
      </View>

    {/* 出发日和结束日 - 在 Web 上可以手动输入 */}
      <View style={styles.dateRow}>
        <View style={styles.dateContainer}>
      <Text style={styles.label}>出発日</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDateInput}
            onChangeText={(text) => {
              setStartDateInput(text);
              const d = tryParseDate(text);
              if (d) setStartDate(d);
            }}
          />
        </View>
        <View style={styles.dateContainer}>
      <Text style={styles.label}>終了日</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={endDateInput}
            onChangeText={(text) => {
              setEndDateInput(text);
              const d = tryParseDate(text);
              if (d) setEndDate(d);
            }}
          />
        </View>
      </View>

      {/* 人数选择 */}
      <View style={styles.row}>
        <Text style={styles.label}>人数</Text>
        <View style={styles.counterContainer}>
          <Text style={styles.counterLabel}>大人</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults((prev) => Math.max(0, prev - 1))}>
            <Text style={styles.buttonText}>-</Text>
          </Pressable>
          <Text style={styles.counterText}>{adults}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setAdults((prev) => prev + 1)}>
            <Text style={styles.buttonText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.counterContainer}>
          <Text style={styles.counterLabel}>子ども</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren((prev) => Math.max(0, prev - 1))}>
            <Text style={styles.buttonText}>-</Text>
          </Pressable>
          <Text style={styles.counterText}>{children}</Text>
          <Pressable
            style={styles.counterButton}
            onPress={() => setChildren((prev) => prev + 1)}>
            <Text style={styles.buttonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* 旅行目的选择 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>旅行目的</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={purpose}
            onValueChange={(itemValue) => setPurpose(itemValue)}>
            <Picker.Item label="目的を選択" value="" />
            {TRAVEL_PURPOSES.map((p) => (
              <Picker.Item key={p} label={p} value={p} />
            ))}
          </Picker>
        </View>
      </View>

  {/* 调用 handleSave 函数 */}
  <Button title="リストを保存" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: '100%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  row: {
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
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  counterLabel: {
    marginRight: 10,
  },
  counterButton: {
    backgroundColor: '#e0e0e0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: '#000',
  },
  counterText: {
    fontSize: 18,
    marginHorizontal: 15,
  },
});