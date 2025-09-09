// app/(tabs)/settings.tsx
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

export default function TabTwoScreen() {
  const { user, loading, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState<boolean>(true);
  const [defaultSort, setDefaultSort] = React.useState<'updatedAt' | 'createdAt' | 'name'>('updatedAt');
  const [autoExpandFirst, setAutoExpandFirst] = React.useState<boolean>(true);
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('app.settings.prefs');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.notificationsEnabled === 'boolean') setNotificationsEnabled(parsed.notificationsEnabled);
          if (parsed?.defaultSort === 'updatedAt' || parsed?.defaultSort === 'createdAt' || parsed?.defaultSort === 'name') setDefaultSort(parsed.defaultSort);
          if (typeof parsed?.autoExpandFirst === 'boolean') setAutoExpandFirst(parsed.autoExpandFirst);
        }
      } catch {}
    })();
  }, []);

  // 登录后尝试从云端加载用户设置
  React.useEffect(() => {
    (async () => {
      if (!user || !db) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'settings'));
        if (snap.exists()) {
          const data: any = snap.data();
          if (typeof data?.notificationsEnabled === 'boolean') setNotificationsEnabled(data.notificationsEnabled);
          if (data?.defaultSort === 'updatedAt' || data?.defaultSort === 'createdAt' || data?.defaultSort === 'name') setDefaultSort(data.defaultSort);
          if (typeof data?.autoExpandFirst === 'boolean') setAutoExpandFirst(data.autoExpandFirst);
        }
      } catch {}
    })();
  }, [user]);

  // 本地持久化 + 云端同步
  React.useEffect(() => {
    (async () => {
      try {
        const payload = { notificationsEnabled, defaultSort, autoExpandFirst };
        await AsyncStorage.setItem('app.settings.prefs', JSON.stringify(payload));
        if (user && db) {
          await setDoc(
            doc(db, 'users', user.uid, 'settings'),
            { ...payload, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
      } catch {}
    })();
  }, [notificationsEnabled, defaultSort, autoExpandFirst, user]);
  // 未登录时跳转到登录页
  React.useEffect(() => {
    if (!loading && !user) {
  router.push({ pathname: '/login' });
    }
  }, [loading, user, router]);
  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>設定</Text> */}
      {loading || !user ? (
        <ActivityIndicator />
      ) : (
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
            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>通知</Text>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </View>
            <Text style={[styles.helpText, { marginTop: 4 }]}>偏好設定</Text>
          </View>
          <Pressable
            style={[styles.btn, styles.btnNeutral, { marginTop: 16, width: '100%', maxWidth: 520 }]}
            onPress={logout}
          >
            <Text style={styles.btnTextDark}>ログアウト</Text>
          </Pressable>
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
    maxHeight: '90%',
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
  btnNeutral: { backgroundColor: '#e70d0db1' },
  btnTextLight: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: '#1f2d3d', fontWeight: '700' },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  prefLabel: { fontSize: 16, color: '#1f2d3d' },
  pickerSmallWrap: {
    flex: 1,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#e5e9f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#eef2f6',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segmentBtn: {
    paddingHorizontal: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  segmentText: { color: '#405065', fontWeight: '600' },
  segmentTextActive: { color: '#1f2d3d', fontWeight: '700' },
});