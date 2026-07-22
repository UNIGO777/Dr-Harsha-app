// Program selection flow (shown after onboarding, before the dashboard is
// reachable). Plain stack: list -> detail.
import { Stack } from 'expo-router';

export default function ProgramsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
