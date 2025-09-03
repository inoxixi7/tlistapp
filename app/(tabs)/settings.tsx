// app/(tabs)/settings.tsx
import * as React from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '@/app/context/AuthContext';

export default function TabTwoScreen() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>設定</Text>
      {loading ? (
        <ActivityIndicator />
      ) : user ? (
        <>
          <Text style={{ marginBottom: 8 }}>ログイン中: {user.email || user.displayName || user.uid}</Text>
          <Pressable
            style={{ backgroundColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
            onPress={logout}
          >
            <Text>ログアウト</Text>
          </Pressable>
          <Text style={{ marginTop: 12, color: '#666', textAlign: 'center' }}>
            ログイン中は旅行リストがクラウドと自動同期されます。
          </Text>
        </>
      ) : (
        <>
          <Pressable
            style={{ backgroundColor: 'dodgerblue', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
            onPress={signInWithGoogle}
          >
            <Text style={{ color: '#fff' }}>Googleでログイン</Text>
          </Pressable>
          <Text style={{ marginTop: 12, color: '#666', textAlign: 'center' }}>
            ログインすると、他のデバイスでも同じリストを利用できます。
          </Text>
        </>
      )}
    </View>
  );
}