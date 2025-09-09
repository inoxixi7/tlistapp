// app/register.tsx
import { useAuth } from '@/app/context/AuthContext';
import { auth, db } from '@/app/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { deleteUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail, loading, user } = useAuth();

  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [password2, setPassword2] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [password2Error, setPassword2Error] = React.useState<string | null>(null);
  const [termsError, setTermsError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  React.useEffect(() => {
    if (!loading && user) {
      // 已登录则直接回到首页
      router.replace({ pathname: '/(tabs)' });
    }
  }, [loading, user, router]);

  const onSubmit = async () => {
    setFormError(null);
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setPassword2Error(null);
    setTermsError(null);

    const name = displayName.trim();
    const e = email.trim();
    const p1 = password;
    const p2 = password2;
    let hasErr = false;
    if (!name) {
      setNameError('ユーザー名を入力してください。');
      hasErr = true;
    }
    if (!e) {
      setEmailError('メールアドレスを入力してください。');
      hasErr = true;
    } else if (!isEmail(e)) {
      setEmailError('メールアドレスの形式が正しくありません。');
      hasErr = true;
    }
    if (!p1) {
      setPasswordError('パスワードを入力してください。');
      hasErr = true;
    } else if (p1.length < 6) {
      setPasswordError('パスワードは6文字以上で入力してください。');
      hasErr = true;
    }
    if (!p2) {
      setPassword2Error('パスワード確認を入力してください。');
      hasErr = true;
    } else if (p1 !== p2) {
      setPassword2Error('パスワードが一致しません。');
      hasErr = true;
    }
    if (!agreed) {
      setTermsError('利用規約に同意してください。');
      hasErr = true;
    }
    if (hasErr) return;
    try {
      setSubmitting(true);
      // check username uniqueness
      if (!db) {
        setFormError('サーバー設定を確認してください。');
        return;
      }
      const uname = name.toLowerCase();
      const unameRef = doc(db, 'usernames', uname);
      const existed = await getDoc(unameRef);
      if (existed.exists()) {
        setNameError('このユーザー名は既に使用されています。');
        return;
      }

      await signUpWithEmail(e, p1);
      // 设置用户显示名
      if (auth?.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: name });
          // 确保最新资料
          await auth.currentUser.reload().catch(() => {});
        } catch {
          // 设置显示名失败不阻塞注册流程
        }
      }
      // create username -> email mapping
      try {
        await setDoc(
          doc(db, 'usernames', uname),
          { email: e, ownerUid: auth?.currentUser?.uid || null, createdAt: serverTimestamp() },
          { merge: false }
        );
      } catch (mapErr: any) {
        const code: string | undefined = mapErr?.code;
        let msg = 'ユーザー名の保存に失敗しました。Firestore のセキュリティルールをご確認ください。';
        if (code === 'permission-denied') msg = 'ユーザー名の保存が許可されていません。Firestore ルールを更新してください。';
        else if (code === 'unavailable') msg = 'サービスに一時的な問題が発生しました。しばらくしてからお試しください。';
        setFormError(msg);
        // rollback created user to avoid inconsistent state
        try {
          if (auth?.currentUser) await deleteUser(auth.currentUser);
        } catch {}
        return;
      }
      router.replace({ pathname: '/(tabs)' });
    } catch (e: any) {
      const code: string | undefined = e?.code;
      let msg = '登録に失敗しました。入力内容をご確認ください。';
      if (code === 'auth/email-already-in-use') msg = 'このメールアドレスは既に使用されています。';
      else if (code === 'auth/invalid-email') msg = 'メールアドレスの形式が正しくありません。';
      else if (code === 'auth/weak-password') msg = 'パスワードが弱すぎます。';
      else if (code === 'auth/network-request-failed') msg = 'ネットワークエラーが発生しました。接続をご確認ください。';
      else if (code === 'permission-denied') msg = 'ユーザー名の保存が許可されていません。Firestore ルールを更新してください。';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '新規登録',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/login' })}
              hitSlop={10}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Ionicons name="chevron-back" size={24} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.card}>
        <Text style={styles.title}>新規登録</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={(t) => {
            setDisplayName(t);
            if (nameError) setNameError(null);
            if (formError) setFormError(null);
          }}
          placeholder="ユーザー名"
        />
        {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError(null);
            if (formError) setFormError(null);
          }}
          placeholder="メールアドレス"
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
          placeholder="パスワード（6文字以上）"
          secureTextEntry
          textContentType="password"
        />
        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        <TextInput
          style={styles.input}
          value={password2}
          onChangeText={(t) => {
            setPassword2(t);
            if (password2Error) setPassword2Error(null);
            if (formError) setFormError(null);
          }}
          placeholder="パスワード確認"
          secureTextEntry
          textContentType="password"
        />
        {!!password2Error && <Text style={styles.errorText}>{password2Error}</Text>}

        <View style={styles.termsRow}>
          <Switch
            value={agreed}
            onValueChange={(v) => {
              setAgreed(v);
              if (termsError) setTermsError(null);
              if (formError) setFormError(null);
            }}
          />
          <Text style={{ marginLeft: 8 }}>利用規約に同意します</Text>
        </View>
        {!!termsError && <Text style={styles.errorText}>{termsError}</Text>}

        {!!formError && <Text style={[styles.errorText, { marginTop: 4 }]}>{formError}</Text>}

        <View style={{ height: 8 }} />
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.btnTextLight}>登録</Text>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  btn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: 'dodgerblue' },
  btnTextLight: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#e11900', marginBottom: 6 },
});
