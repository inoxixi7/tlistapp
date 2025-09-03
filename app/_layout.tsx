// app/_layout.tsx
import { Stack } from 'expo-router';
import { ListProvider } from './context/ListContext'; // 导入 ListProvider
import { AuthProvider } from './context/AuthContext';
import { CloudSync } from './context/CloudSync';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ListProvider>
        <CloudSync>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="newlist" options={{ title: '新しいリストを追加' }} />
            <Stack.Screen name="recommendedlist" options={{ title: 'おすすめリスト', headerRight: () => null }} />
          </Stack>
        </CloudSync>
      </ListProvider>
    </AuthProvider>
  );
}