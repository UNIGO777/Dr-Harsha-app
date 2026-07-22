// Root layout — wires the whole app's providers and holds the splash screen up
// until the design fonts (Fraunces + Inter) are ready.
//
// Provider order (outermost first):
//   GestureHandlerRootView  → required by reanimated/gestures/navigation
//   SafeAreaProvider        → notch / home-indicator insets
//   QueryClientProvider     → server state (React Query)
//
// Note: as of SDK 56 expo-router is decoupled from react-navigation, so we do
// NOT import @react-navigation's ThemeProvider. The dark background is enforced
// by app.json (backgroundColor + userInterfaceStyle:dark) and the Stack's
// contentStyle below, which avoids white flashes on navigation.
import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/store/authStore';
import { fontMap } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

// Keep the native splash visible until we explicitly hide it below.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const hydrate = useAuthStore((s) => s.hydrate);

  // Restore any persisted session on launch (reads the token from SecureStore).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Reveal the app once fonts are in (or if they fail — don't trap the user).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // splash stays up
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.base }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.base },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(programs)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
