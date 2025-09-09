// app/terms.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '利用規約',
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={10}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Ionicons name="chevron-back" size={24} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>利用規約</Text>
        <Text style={styles.paragraph}>
          本規約は、本アプリ（以下「本サービス」といいます）の利用条件を定めるものです。ユーザーは、本規約に同意のうえ本サービスを利用するものとします。
        </Text>
        <Text style={styles.heading}>第1条（適用）</Text>
        <Text style={styles.paragraph}>
          本規約は、ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されます。
        </Text>
        <Text style={styles.heading}>第2条（禁止事項）</Text>
        <Text style={styles.paragraph}>
          法令または公序良俗に違反する行為、他のユーザーに対する嫌がらせ、スパム、不正アクセス、その他当方が不適切と判断する行為を禁止します。
        </Text>
        <Text style={styles.heading}>第3条（サービスの提供の停止等）</Text>
        <Text style={styles.paragraph}>
          当方は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができます。
        </Text>
        <Text style={styles.heading}>第4条（免責）</Text>
        <Text style={styles.paragraph}>
          当方は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。ユーザーの損害について一切の責任を負いません。
        </Text>
        <Text style={styles.heading}>第5条（規約の変更）</Text>
        <Text style={styles.paragraph}>
          当方は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができます。
        </Text>
        <Text style={styles.paragraph}>
          最新の規約は本ページに掲示されます。ユーザーは、本サービスの継続的な利用をもって変更後の規約に同意したものとみなされます。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#1f2d3d' },
  heading: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  paragraph: { fontSize: 14, lineHeight: 20, color: '#374151' },
});
