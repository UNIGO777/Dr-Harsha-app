// Root layout — wires the whole app's providers and holds the splash screen up
// until the design font (Inter) is ready.
//
// Provider order (outermost first):
//   GestureHandlerRootView  → required by reanimated/gestures/navigation
//   SafeAreaProvider        → notch / home-indicator insets
//   QueryClientProvider     → server state (React Query)
//
// Note: as of SDK 56 expo-router is decoupled from react-navigation, so we do
// NOT import @react-navigation's ThemeProvider. Theming runs through NativeWind
// (see src/theme/useTheme.ts); the Stack's contentStyle below tracks the active
// palette so navigation never flashes the opposite theme.
import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { useAuthStore } from '@/store/authStore';
import { fontMap } from '@/theme/fonts';
import { themeVars } from '@/theme/tokens';
import { useResolvedTheme, useThemeColors, useThemeStore } from '@/theme/useTheme';

// Keep the native splash visible until we explicitly hide it below.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colors = useThemeColors();
  const theme = useResolvedTheme();
  const [fontsLoaded, fontError] = useFonts(fontMap);
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const themeReady = useThemeStore((s) => s.hydrated);

  // Restore any persisted session on launch (reads the token from SecureStore).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Read the saved appearance BEFORE anything renders, so a pinned theme never
  // flashes as the system one on a cold start.
  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  // Reveal the app once fonts AND the theme are in (or fonts fail — don't trap
  // the user behind a font download).
  useEffect(() => {
    if ((fontsLoaded || fontError) && themeReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, themeReady]);

  // Rebuilt only when the palette actually changes, so a theme switch is the
  // one thing that invalidates the whole tree's variables.
  const themeStyle = useMemo(() => vars(themeVars(colors)), [colors]);

  if ((!fontsLoaded && !fontError) || !themeReady) {
    return null; // splash stays up
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.base }}>
      {/* THE theme switch. These inline variables outrank the ones the
          stylesheet puts on :root, so re-rendering this View with a different
          palette repaints every `bg-base` / `text-primary` class in the tree.
          NativeWind's own class-based dark mode can't be toggled at runtime on
          RN 0.83 — see the note in src/theme/useTheme.ts. */}
      <View style={themeStyle} className="flex-1">
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            {/* Inverse of the canvas: light glyphs on the dark theme, dark on light. */}
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
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
              <Stack.Screen name="(session)" />
              <Stack.Screen name="(profile)" />
            </Stack>
          </QueryClientProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
