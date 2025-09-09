// 文件用途：
// - 登录页面。支持邮箱或用户名 + 密码登录，以及 Google 登录（Web）。
// - 提供“忘记密码”“从用户名显示邮箱”辅助功能。
// - 登录成功后跳转回主 Tab。
// app/login.tsx
import { useAuth } from '@/app/context/AuthContext';
import { auth, db } from '@/app/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const { user, loading, signInWithGoogle, signInWithEmail } = useAuth();
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  React.useEffect(() => {
    if (!loading && user) {
      // 已登录，返回首页 Tab
      router.replace({ pathname: '/(tabs)' });
    }
  }, [loading, user, router]);

  const onLogin = async () => {
    try {
      setSubmitting(true);
      setFormError(null);
      setInfoMessage(null);
      setEmailError(null);
      setPasswordError(null);
      const e = email.trim();
      const p = password;
      let hasErr = false;
      if (!e) {
        setEmailError('メールアドレスまたはユーザー名を入力してください。');
        hasErr = true;
      } else if (e.includes('@') && !isEmail(e)) {
        setEmailError('メールアドレスの形式が正しくありません。');
        hasErr = true;
      }
      if (!p) {
        setPasswordError('パスワードを入力してください。');
        hasErr = true;
      }
      if (hasErr) return;

      if (e.includes('@') || isEmail(e)) {
        await signInWithEmail(e, p);
      } else {
        // treat as username: map to email via Firestore
        if (!db) {
          setFormError('サーバー設定を確認してください。');
          return;
        }
        const snap = await getDoc(doc(db, 'usernames', e.toLowerCase()));
        if (!snap.exists()) {
          setFormError('ユーザー名が見つかりません。');
          return;
        }
        const data: any = snap.data();
        const mappedEmail: string | undefined = data?.email;
        if (!mappedEmail) {
          setFormError('ユーザー名に関連付けられたメールが見つかりません。');
          return;
        }
        await signInWithEmail(mappedEmail, p);
      }
      router.replace({ pathname: '/(tabs)' });
    } catch (e: any) {
      const code: string | undefined = e?.code;
      let msg = 'メールとパスワードをご確認ください。';
      if (code === 'auth/invalid-email') msg = 'メールアドレスの形式が正しくありません。';
      else if (code === 'auth/user-not-found') msg = 'ユーザーが見つかりません。新規登録してください。';
      else if (code === 'auth/wrong-password') msg = 'パスワードが正しくありません。';
      else if (code === 'auth/too-many-requests') msg = '試行回数が多すぎます。しばらくしてからお試しください。';
      else if (code === 'auth/network-request-failed') msg = 'ネットワークエラーが発生しました。接続をご確認ください。';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = () => {
    router.push({ pathname: '/register' });
  };

  const maskEmail = (em: string) => {
    const [local, domain] = em.split('@');
    if (!local || !domain) return em;
    const maskedLocal = local.length <= 2 ? local[0] + '*' : local[0] + '***';
    const parts = domain.split('.');
    const maskedDomain = parts[0].length <= 2 ? parts[0][0] + '*' : parts[0][0] + '***';
    const tld = parts.slice(1).join('.') || '';
    return `${maskedLocal}@${maskedDomain}${tld ? '.' + tld : ''}`;
  };

  const onForgotPassword = async () => {
    try {
      setSubmitting(true);
      setFormError(null);
      setInfoMessage(null);
      const identifier = email.trim();
      if (!identifier) {
        setEmailError('メールアドレスまたはユーザー名を入力してください。');
        return;
      }
      let targetEmail = identifier;
      if (!identifier.includes('@')) {
        // username -> email
        if (!db) {
          setFormError('サーバー設定を確認してください。');
          return;
        }
        const snap = await getDoc(doc(db, 'usernames', identifier.toLowerCase()));
        if (!snap.exists()) {
          setFormError('ユーザー名が見つかりません。');
          return;
        }
        targetEmail = (snap.data() as any)?.email;
        if (!targetEmail) {
          setFormError('ユーザー名に関連付けられたメールが見つかりません。');
          return;
        }
      } else if (!isEmail(identifier)) {
        setEmailError('メールアドレスの形式が正しくありません。');
        return;
      }
      if (!auth) {
        setFormError('サーバー設定を確認してください。');
        return;
      }
      await sendPasswordResetEmail(auth, targetEmail);
      setInfoMessage(`パスワード再設定メールを送信しました：${maskEmail(targetEmail)}`);
    } catch (e: any) {
      const code: string | undefined = e?.code;
      let msg = 'メール送信に失敗しました。しばらくしてからお試しください。';
      if (code === 'auth/user-not-found') msg = '該当するアカウントが見つかりません。';
      else if (code === 'auth/invalid-email') msg = 'メールアドレスの形式が正しくありません。';
      else if (code === 'auth/missing-email') msg = 'メールアドレスを入力してください。';
      else if (code === 'auth/network-request-failed') msg = 'ネットワークエラーが発生しました。接続をご確認ください。';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onRevealEmailFromUsername = async () => {
    try {
      setSubmitting(true);
      setFormError(null);
      setInfoMessage(null);
      const identifier = email.trim();
      if (!identifier || identifier.includes('@')) {
        setEmailError('ユーザー名を入力してください。');
        return;
      }
      if (!db) {
        setFormError('サーバー設定を確認してください。');
        return;
      }
      const snap = await getDoc(doc(db, 'usernames', identifier.toLowerCase()));
      if (!snap.exists()) {
        setFormError('ユーザー名が見つかりません。');
        return;
      }
      const mappedEmail: string | undefined = (snap.data() as any)?.email;
      if (!mappedEmail) {
        setFormError('ユーザー名に関連付けられたメールが見つかりません。');
        return;
      }
      setInfoMessage(`登録メール: ${maskEmail(mappedEmail)}`);
    } catch {
      setFormError('処理に失敗しました。もう一度お試しください。');
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
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError(null);
            if (formError) setFormError(null);
          }}
          placeholder="メールアドレス または ユーザー名"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (passwordError) setPasswordError(null);
            if (formError) setFormError(null);
          }}
          placeholder="パスワード"
          secureTextEntry
          textContentType="password"
        />
        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        {!!formError && <Text style={[styles.errorText, { marginTop: 4 }]}>{formError}</Text>}
        <View style={{ height: 8 }} />
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onLogin} disabled={submitting}>
          <Text style={styles.btnTextLight}>ログイン</Text>
        </Pressable>
        <View style={{ height: 8 }} />
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onRegister} disabled={submitting}>
          <Text style={styles.btnTextLight}>新規登録</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable onPress={onForgotPassword} disabled={submitting}>
          <Text style={{ color: 'dodgerblue', textAlign: 'center' }}>パスワードをお忘れですか？</Text>
        </Pressable>
        <View style={{ height: 6 }} />
        <Pressable onPress={onRevealEmailFromUsername} disabled={submitting}>
          <Text style={{ color: 'dodgerblue', textAlign: 'center' }}>ユーザー名から登録メールを確認</Text>
        </Pressable>
        {!!infoMessage && <Text style={[styles.infoText, { marginTop: 8, textAlign: 'center' }]}>{infoMessage}</Text>}
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
  errorText: { color: '#e11900', marginBottom: 6 },
  infoText: { color: '#0b6e4f' },
});
