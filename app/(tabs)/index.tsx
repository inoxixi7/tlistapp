// app/(tabs)/index.tsx
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useList } from '../context/ListContext';

export default function HomeScreen() {
  const { savedList } = useList();
  const router = useRouter();

  const handleEdit = () => {
    // 如果有保存的清单，直接导航到 recommendedlist 页面并传递所有原始参数
    if (savedList) {
      router.push({
        pathname: '/recommendedlist',
        params: { ...savedList.originalParams, checkedItems: JSON.stringify(savedList.checkedItems || {}) },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的旅行清单</Text>

      {savedList ? (
        <Pressable style={styles.listCard} onPress={handleEdit}>
          <Text style={styles.cardTitle}>{savedList.listName}</Text>
          <Text style={styles.cardInfo}>目的地: {savedList.destination}</Text>
          <Text style={styles.cardInfo}>人数: {savedList.adults}大, {savedList.children}小</Text>
          <Text style={styles.cardInfo}>天数: {savedList.duration}天</Text>
        </Pressable>
      ) : (
        <Text style={styles.placeholder}>还没有保存的清单，快去创建一个吧！</Text>
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
  cardInfo: {
    fontSize: 16,
    color: '#555',
  },
  placeholder: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
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