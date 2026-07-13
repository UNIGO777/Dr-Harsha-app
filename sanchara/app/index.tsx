// Placeholder landing screen. No feature logic — it exists to prove the
// foundation is wired: base background, both fonts, accent Button, the linear
// gradient scrim, a lucide icon, and NativeWind utility classes all rendering.
import { LinearGradient } from 'expo-linear-gradient';
import { Activity } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function Index() {
  return (
    <View className="flex-1 bg-base">
      {/* Cinematic bottom scrim — the pattern used over full-bleed images later. */}
      <LinearGradient
        colors={['transparent', 'rgba(105,209,192,0.06)', colors.base]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' }}
      />

      <SafeAreaView className="flex-1 justify-between px-6 py-6">
        <View className="mt-16 items-start">
          <View className="mb-8 h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <Activity color={colors.accentText} size={26} strokeWidth={2.4} />
          </View>

          {/* Fraunces display serif — wordmark + headline */}
          <Text className="font-display-bold text-5xl leading-tight text-primary">Sanchara</Text>
          <Text className="mt-4 font-display text-xl leading-8 text-secondary">
            Movement, medically supervised.
          </Text>

          {/* Inter UI sans — micro label + body */}
          <Text className="mt-10 font-sans text-xs uppercase tracking-[3px] text-micro">
            Foundation ready
          </Text>
          <Text className="mt-3 font-sans text-base leading-6 text-secondary">
            Dark theme, Fraunces + Inter, NativeWind tokens, navigation, React Query, secure
            storage and haptics are all wired. Feature screens come next.
          </Text>
        </View>

        <View className="gap-3">
          <Button label="Get started" onPress={() => {}} />
          <Button label="I already have an account" variant="ghost" onPress={() => {}} />
        </View>
      </SafeAreaView>
    </View>
  );
}
