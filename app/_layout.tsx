// app/_layout.tsx
import { Stack } from 'expo-router';
import { ListProvider } from './context/ListContext'; // 导入 ListProvider

export default function RootLayout() {
  return (
    <ListProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="newlist" options={{ title: '新しいリストを追加' }} />
  <Stack.Screen name="recommendedlist" options={{ title: 'おすすめリスト', headerRight: () => null }} />
      </Stack>
    </ListProvider>
  );
}