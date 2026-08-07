// Profile tab. Minimal for now — shows the signed-in number and a logout button
// (handy for testing the auth flow end-to-end).
import { useRouter } from 'expo-router';
import { User as UserIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ThemePicker } from '@/components/ui';
import { formatPhoneForDisplay } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { useThemeColors } from '@/theme/useTheme';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const phone = useAuthStore((s) => s.phone);
  const signOut = useAuthStore((s) => s.signOut);

  async function onLogout() {
    await signOut();
    router.replace('/');
  }

  return (
    <SafeAreaView className="flex-1 bg-base px-6">
      <Text className="mt-4 font-display-bold text-4xl text-primary">Profile</Text>

      <Card className="mt-8 flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-input-fill">
          <UserIcon color={colors.accent} size={22} />
        </View>
        <View className="ml-4">
          <Text className="font-sans text-xs uppercase tracking-[2px] text-micro">
            Signed in as
          </Text>
          <Text className="mt-1 font-sans-semibold text-base text-primary">
            {phone ? formatPhoneForDisplay(phone) : 'Your account'}
          </Text>
        </View>
      </Card>

      <View className="mt-8">
        <Text className="font-sans text-xs uppercase tracking-[2px] text-micro">Appearance</Text>
        <View className="mt-3">
          <ThemePicker />
        </View>
      </View>

      <View className="mt-auto pb-6">
        <Button label="Log out" variant="secondary" onPress={onLogout} />
      </View>
    </SafeAreaView>
  );
}
