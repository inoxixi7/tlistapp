// app/recommendedlist.tsx
import React, { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// 导入 useLocalSearchParams 和 useRouter
import { useLocalSearchParams, useRouter } from 'expo-router';
// 导入 useNavigation
import { useNavigation } from 'expo-router';
// 导入 useList
import { useList } from './context/ListContext';

// 辅助函数，用于计算旅行天数
function getDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}


const ITEMS_BY_PURPOSE = {
  观光: [
    '舒适的步行鞋',
    '相机',
    '移动电源',
    '防晒霜',
    '遮阳帽',
    '地图/旅行指南',
  ],
  购物: [
    '可重复使用的购物袋',
    '大容量行李箱',
    '便携式行李秤',
    '信用卡/现金',
    '退税单',
  ],
  美食: ['消化药', '湿纸巾', '宽松舒适的衣物'],
  商务: ['正装', '笔记本电脑', '名片', '文件袋'],
  探亲: ['小礼物', '家庭照片', '当地特产'],
  休闲: ['泳衣', '沙滩巾', '墨镜', '休闲服装'],
};

const BASE_ITEMS = [
  '护照/签证',
  '机票/车票',
  '酒店预订单',
  '身份证',
  '现金/信用卡',
  '手机及充电器',
  '个人卫生用品',
  '换洗衣物',
  '常用药品',
];

export default function RecommendedListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { saveList } = useList(); // 使用 useList 钩子

  const { destination, startDate, endDate, adults, children, purpose } = params;

  const parsedAdults = Number(adults) || 0;
  const parsedChildren = Number(children) || 0;
  const duration = getDuration(startDate, endDate);

  const purposeItems = ITEMS_BY_PURPOSE[purpose as string] || [];
  const recommendedItems = [...BASE_ITEMS, ...purposeItems];

  const [checkedItems, setCheckedItems] = useState({});

  const handleToggleCheck = (item) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };
  
  // 在导航栏右侧添加一个保存按钮
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleSave}>
          <Text style={styles.headerButton}>保存</Text>
        </Pressable>
      ),
    });
  }, [navigation, params, saveList]); // 依赖项中添加 params 和 saveList

  const handleSave = () => {
    // 准备要传递回 home 页面的数据
    const listSummary = {
      destination: destination,
      duration: duration,
      adults: parsedAdults,
      children: parsedChildren,
      purpose: purpose,
      // 将所有原始参数保存，以便编辑时使用
      originalParams: params,
      // 可以在这里添加更多你想保存的数据，比如清单名称
      listName: '日本旅行计划' // 示例，你可能需要从 newlist 页面传递过来
    };

    // 这里是关键：返回上一页并传递参数
    // 我们将数据作为参数传递给 home 页面
    saveList(listSummary); // 将数据保存到 Context
    // 使用 router.replace() 替换当前页面，直接返回到 home 页面
    router.replace('/'); 
    // 实际的参数传递，需要通过 context 或全局状态管理
    // router.setParams({ savedList: listSummary });
    // 由于 Expo Router 的 router.back() 不支持直接传参，我们可以在 home 页面监听导航事件或使用全局状态。
    // 为了简单起见，我们暂时先模拟一个返回操作，稍后通过全局状态来完善。
    // 在实际项目中，可以使用 Jotai, Zustand 或 Redux 来存储状态。
    // 这里我们先不处理传递逻辑，仅返回。
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>为你推荐的旅行清单</Text>
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          <Text style={styles.label}>出行人数:</Text>
          {parsedAdults}个大人, {parsedChildren}个小孩
        </Text>
        <Text style={styles.summaryText}>
          <Text style={styles.label}>旅行天数:</Text>
          {duration}天
        </Text>
        <Text style={styles.summaryText}>
          <Text style={styles.label}>旅行目的:</Text>
          {purpose || '未选择'}
        </Text>
      </View>
      <View style={styles.listContainer}>
        {recommendedItems.map((item) => (
          <Pressable
            key={item}
            style={styles.listItem}
            onPress={() => handleToggleCheck(item)}
          >
            <View style={[styles.checkbox, checkedItems[item] && styles.checkedCheckbox]}>
              {checkedItems[item] && <Text style={styles.checkedText}>✓</Text>}
            </View>
            <Text style={styles.itemText}>{item}</Text>
          </Pressable>
        ))}
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
});