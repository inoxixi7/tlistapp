// app/login.tsx
import { useAuth } from '@/app/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      // 已登录，返回首页 Tab
      router.replace({ pathname: '/(tabs)' });
    }
  }, [loading, user, router]);

  const onLogin = async () => {
    try {
      setSubmitting(true);
      await signInWithEmail(email.trim(), password);
      router.replace({ pathname: '/(tabs)' });
    } catch (e: any) {
      Alert.alert('ログイン失敗', e?.message || 'メールとパスワードをご確認ください。');
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async () => {
    try {
      setSubmitting(true);
      await signUpWithEmail(email.trim(), password);
      router.replace({ pathname: '/(tabs)' });
    } catch (e: any) {
      Alert.alert('新規登録失敗', e?.message || '入力内容をご確認ください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'ログイン',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/(tabs)' })}
              hitSlop={10}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Ionicons name="chevron-back" size={24} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.card}>
        <Text style={styles.title}>ログイン</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード"
          secureTextEntry
          textContentType="password"
        />
        <View style={{ height: 8 }} />
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onLogin} disabled={submitting}>
          <Text style={styles.btnTextLight}>ログイン</Text>
        </Pressable>
        <View style={{ height: 8 }} />
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onRegister} disabled={submitting}>
          <Text style={styles.btnTextLight}>新規登録</Text>
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={[styles.btn, styles.btnGoogle]} onPress={signInWithGoogle} disabled={submitting}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }} style={{ width: 18, height: 18, marginRight: 8 }} />
            <Text style={styles.btnTextDark}>Googleでログイン</Text>
          </View>
        </Pressable>
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
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e9f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  divider: { height: 1, backgroundColor: '#eef2f6', marginVertical: 14 },
  btn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: 'dodgerblue' },
  btnSecondary: { backgroundColor: '#34c759' },
  btnGoogle: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e9f0' },
  btnTextLight: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: '#1f2d3d', fontWeight: '700' },
});
