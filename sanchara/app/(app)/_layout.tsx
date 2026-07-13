// Authenticated area. Wraps the tab navigator so we can later add auth-gated
// modals/stacks (e.g. the full-screen session player) as siblings of the tabs.
import { Stack } from 'expo-router';

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
