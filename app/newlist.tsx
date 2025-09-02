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
  '东京',
  '大阪',
  '京都',
  '北海道',
  '福冈',
  '冲绳',
];

const TRAVEL_PURPOSES = [
  '观光',
  '购物',
  '美食',
  '商务',
  '探亲',
  '休闲',
];

export default function NewListScreen() {
  const router = useRouter(); // 使用 useRouter 钩子

  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateType, setActiveDateType] = useState('start');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [purpose, setPurpose] = useState('');

  // 这个函数只在原生应用上被调用
  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (activeDateType === 'start') {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  // 新增的保存处理函数
  const handleSave = () => {
    // 使用 router.push() 导航并传递参数
    router.push({
      pathname: '/recommendedlist', // 目标页面的路径名
      params: {
        destination,
        startDate: startDate.toISOString(), // 将日期转换为字符串以便传递
        endDate: endDate.toISOString(),     // 将日期转换为字符串以便传递
        adults,
        children,
        purpose,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>新的清单</Text>

      {/* 清单名称 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>清单名称</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：日本旅行计划"
        />
      </View>

      {/* 目的地选择 */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>目的地</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={destination}
            onValueChange={(itemValue) => setDestination(itemValue)}>
            <Picker.Item label="请选择目的地" value="" />
            {DESTINATIONS.map((dest) => (
              <Picker.Item key={dest} label={dest} value={dest} />
            ))}
          </Picker>
        </View>
      </View>

      {/* 出发日和结束日 - 在 Web 上可以手动输入 */}
      <View style={styles.dateRow}>
        <View style={styles.dateContainer}>
          <Text style={styles.label}>出发日</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDate.toLocaleDateString()}
            onChangeText={(text) => setStartDate(new Date(text))}
          />
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.label}>结束日</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={endDate.toLocaleDateString()}
            onChangeText={(text) => setEndDate(new Date(text))}
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
          <Text style={styles.counterLabel}>小孩</Text>
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
            <Picker.Item label="请选择目的" value="" />
            {TRAVEL_PURPOSES.map((p) => (
              <Picker.Item key={p} label={p} value={p} />
            ))}
          </Picker>
        </View>
      </View>

      {/* 调用 handleSave 函数 */}
      <Button title="保存清单" onPress={handleSave} />
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