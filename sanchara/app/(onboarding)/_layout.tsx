// 13-field onboarding flow across ~11 steps. Stack with a slide animation; the
// running draft is held in the zustand onboardingStore, not in route params.
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
