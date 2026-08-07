import { colorScheme as nativewindColorScheme } from 'nativewind';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { palettes, type Palette, type ThemeName } from './tokens';

/**
 * Theme preference — CLIENT state.
 *
 *   'system' (default) follows the OS setting and keeps following it live.
 *   'light' / 'dark'   pin the app regardless of the OS.
 *
 * ─── Why this doesn't use NativeWind's class-based dark mode ────────────────
 *
 * NativeWind's `colorScheme.set()` does not toggle anything on React Native
 * 0.83. It delegates to `Appearance.setColorScheme()` and then waits for
 * `Appearance.addChangeListener` to fire — but RN only emits that event for
 * genuine OS-level changes (Appearance.js emits from the native
 * `appearanceChanged` listener; the programmatic setter updates its cache and
 * returns silently). So NativeWind's internal observable never moves and the
 * `.dark:root` variables never take effect. Setting the theme appeared to do
 * nothing.
 *
 * Instead the palette is pushed down the tree as CSS variables via `vars()` on
 * a root View (see app/_layout.tsx), keyed off the store below. Inline
 * variables beat the stylesheet's, so every `bg-base` / `text-primary` class in
 * the app still flips with no `dark:` prefixes — we just own the switch.
 *
 * `Appearance.setColorScheme` is still called, because it does correctly drive
 * NATIVE surfaces (keyboard, alerts, action sheets) even though it doesn't
 * notify JS listeners.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'sanchara.theme';

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Push the choice at the native layer. Safe to call before mount. */
function applyNative(preference: ThemePreference) {
  try {
    nativewindColorScheme.set(preference);
  } catch {
    // Never let a theme change take the app down.
  }
}

interface ThemeState {
  preference: ThemePreference;
  /** True once the persisted value has been read — the root layout waits on this. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  hydrated: false,

  hydrate: async () => {
    let stored: string | null = null;
    try {
      stored = await SecureStore.getItemAsync(STORAGE_KEY);
    } catch {
      // Unreadable store is not fatal — fall back to following the system.
    }

    const preference = isPreference(stored) ? stored : 'system';
    applyNative(preference);
    set({ preference, hydrated: true });
  },

  setPreference: async (preference) => {
    applyNative(preference);
    set({ preference });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, preference);
    } catch {
      // Non-fatal: correct for this run, it just won't survive a restart.
    }
  },
}));

/**
 * The theme actually being rendered ('system' already collapsed to a concrete
 * one). RN's `useColorScheme` is only consulted in system mode — where the
 * native override is 'unspecified', so it reports the true OS setting — and it
 * re-renders on real OS changes, which is exactly the case we want to follow.
 */
export function useResolvedTheme(): ThemeName {
  const preference = useThemeStore((s) => s.preference);
  const system = useColorScheme();

  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'light' ? 'light' : 'dark';
}

/**
 * Active palette for native APIs that can't take a className — SVG fills, icon
 * colours, placeholderTextColor, StatusBar.
 *
 * Always call this inside a component; importing a palette directly would freeze
 * the colours at whatever the theme was when the module loaded.
 */
export function useThemeColors(): Palette {
  return palettes[useResolvedTheme()];
}
