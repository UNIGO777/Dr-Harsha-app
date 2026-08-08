/**
 * Font registration map. Keys become the `fontFamily` names used across the app
 * (they match `fonts` in `tokens.ts`); values are the .ttf assets shipped by the
 * @expo-google-fonts packages. Passed to expo-font's `useFonts` in the root
 * layout so the splash screen stays up until every weight is ready.
 *
 * We only register the weights the design system actually uses — keeping the
 * bundle lean rather than loading all nine Inter weights.
 *
 * Inter is the app's ONLY face; the headline tier is the same font at a heavier
 * weight (see `fonts` in tokens.ts).
 */
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export const fontMap = {
  Inter: Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
} as const;
