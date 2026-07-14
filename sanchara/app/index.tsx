// Landing / get-started screen. Content flows from the top; the primary CTA is
// pinned to the bottom. Icon + accent kept as-is per design direction.
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function Index() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-base">
      {/* Cinematic bottom scrim — the pattern used over full-bleed images later. */}
      <LinearGradient
        colors={['transparent', 'rgba(105,209,192,0.06)', colors.base]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
      />

      <SafeAreaView className="flex-1 px-6 py-6">
        {/* Content, from the top */}
        <View className="mt-6">
          <View className="mb-8 h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <Activity color={colors.accentText} size={26} strokeWidth={2.4} />
          </View>

          <Text className="font-display-bold text-5xl leading-tight text-primary">Sanchara</Text>
          <Text className="mt-4 font-display text-xl leading-8 text-secondary">
            Movement, medically supervised.
          </Text>

          <Text className="mt-8 font-sans text-base leading-7 text-secondary">
            Doctor-designed exercise programmes that help you rebuild strength, ease stiffness, and
            move without pain — guided every step of the way by Dr. Harsha KJ&apos;s Lifestyle &amp;
            Prevention Centre.
          </Text>
        </View>

        {/* CTA, pinned to the bottom */}
        <View className="mt-auto gap-3">
          <Button label="Get started" onPress={() => router.push('/(auth)/phone-entry')} />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push('/(auth)/phone-entry')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
