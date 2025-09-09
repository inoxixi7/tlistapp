// 文件用途：
// - 底部 Tab 布局，仅包含 Home(index) 与 Settings 两个标签页。
// - 图标通过自定义 IconSymbol 实现 iOS/Android/Web 一致表现。
// app/(tabs)/_layout.tsx
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}