// app/(tabs)/settings.tsx
import { useAuth } from '@/app/context/AuthContext';
import * as React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function TabTwoScreen() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>設定</Text> */}
      {loading ? (
        <ActivityIndicator />
      ) : user ? (
        <>
          <View style={styles.card}>
            <View style={styles.rowCenter}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.nameText}>{user.displayName || 'ゲスト'}</Text>
                {!!user.email && <Text style={styles.emailText}>{user.email}</Text>}
                {!user.displayName && !user.email && <Text style={styles.emailText}>{user.uid}</Text>}
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.helpText}>ログイン中は旅行リストがクラウドと自動同期されます。</Text>
            <Pressable style={[styles.btn, styles.btnNeutral]} onPress={logout}>
              <Text style={styles.btnTextDark}>ログアウト</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.helpText}>ログインすると、他のデバイスでも同じリストを利用できます。</Text>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={signInWithGoogle}>
              <Text style={styles.btnTextLight}>Googleでログイン</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    // backgroundColor: 'rgba(245, 247, 251, 1)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    color: '#1f2d3d',
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
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232, 237, 243, 1)',
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '700', color: '#3b4a5a' },
  nameText: { fontSize: 18, fontWeight: '700', color: '#1f2d3d' },
  emailText: { fontSize: 14, color: '#6b7a90', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#eef2f6', marginVertical: 14 },
  helpText: { color: '#6b7a90', marginBottom: 12 },
  btn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: 'dodgerblue' },
  btnNeutral: { backgroundColor: '#eef2f6' },
  btnTextLight: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: '#1f2d3d', fontWeight: '700' },
});