// app/_layout.tsx
import { Stack } from 'expo-router';
import { ListProvider } from './context/ListContext'; // 导入 ListProvider

export default function RootLayout() {
  return (
    <ListProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="newlist" options={{ title: '添加新清单' }} />
        <Stack.Screen name="recommendedlist" options={{ title: '推荐清单', headerRight: () => null }} />
      </Stack>
    </ListProvider>
  );
}