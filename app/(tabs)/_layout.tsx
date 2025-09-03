// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
  <Tabs.Screen name="index" options={{ title: 'ホーム' }} />
  <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}