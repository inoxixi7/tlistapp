// 文件用途：
// - 应用根部的 Stack 布局与全局 Provider 注入。
// - 注入 AuthProvider（认证）、ListProvider（清单本地存储）、CloudSync（云同步）。
// - 在此集中声明可直接通过路径访问的页面（newlist/recommendedlist/login/register/terms）。
// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from './context/AuthContext';
import { CloudSync } from './context/CloudSync';
import { ListProvider } from './context/ListContext'; // 导入 ListProvider

export default function RootLayout() {
  return (
    <AuthProvider>
      <ListProvider>
        <CloudSync>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="newlist" options={{ title: '新しいリストを追加' }} />
            <Stack.Screen name="recommendedlist" options={{ title: 'おすすめリスト', headerRight: () => null }} />
            <Stack.Screen name="login" options={{ title: 'ログイン' }} />
            <Stack.Screen name="register" options={{ title: '新規登録' }} />
            <Stack.Screen name="terms" options={{ title: '利用規約' }} />
          </Stack>
        </CloudSync>
      </ListProvider>
    </AuthProvider>
  );
}