// ═══════════════════════════════════════════════════════════════
// Aria Companion — Root Layout
// ═══════════════════════════════════════════════════════════════

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { COLORS } from '@/constants/config'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="paired" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
