/**
 * StickyHeader — the compact bar that fades in once the user scrolls past the
 * greeting. It sits above the scroll view (absolute) and mirrors the inline
 * header's controls, so the wordmark, wallet balance and profile are always one
 * tap away without stealing space at rest.
 *
 * Driven by a reanimated shared value from the scroll handler, so the fade runs
 * on the UI thread (no re-render per frame).
 */
import { Bell, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface StickyHeaderProps {
  scrollY: SharedValue<number>;
  /** Scroll offset at which the bar reaches full opacity. */
  threshold?: number;
  balanceLabel?: string;
  onPressWallet?: () => void;
  onPressProfile?: () => void;
  onPressAlerts?: () => void;
  /** > 0 shows the dot on the bell. */
  alertCount?: number;
}

export function StickyHeader({
  scrollY,
  threshold = 120,
  balanceLabel,
  onPressWallet,
  onPressProfile,
  onPressAlerts,
  alertCount = 0,
}: StickyHeaderProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [threshold * 0.5, threshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      // Keep it out of the way of touches until it's actually visible.
      pointerEvents: opacity > 0.9 ? 'auto' : 'none',
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [threshold * 0.5, threshold],
            [-8, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top,
        },
        animatedStyle,
      ]}
    >
      {/* Near-opaque rather than a blur: keeps the app free of an extra native
          module (expo-blur), and against the page canvas the difference is
          imperceptible in either theme. */}
      <View
        className="flex-row items-center justify-between px-5 py-3"
        style={{
          backgroundColor: withAlpha(colors.base, 0.96),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
          <Text
            className="font-sans-bold text-[13px]"
            style={{ color: colors.accent, letterSpacing: 2 }}
          >
            SANCHARA
          </Text>

          <View className="flex-row items-center gap-2">
            {balanceLabel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Wallet balance ${balanceLabel}`}
                onPress={onPressWallet}
                className="rounded-pill px-3 py-1.5 active:opacity-80"
                style={{
                  backgroundColor: colors.inputFill,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text className="font-sans-semibold text-[12px] text-primary">{balanceLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                alertCount > 0 ? `Notifications, ${alertCount} need attention` : 'Notifications'
              }
              onPress={onPressAlerts}
              className="h-8 w-8 items-center justify-center rounded-pill active:opacity-70"
              style={{ backgroundColor: colors.inputFill }}
            >
              <Bell size={15} color={colors.textSecondary} />
              {alertCount > 0 ? (
                <View
                  className="absolute right-1 top-1 h-2.5 w-2.5 rounded-pill"
                  style={{ backgroundColor: colors.amber, borderWidth: 1.5, borderColor: colors.inputFill }}
                />
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={onPressProfile}
              className="h-8 w-8 items-center justify-center rounded-pill active:opacity-70"
              style={{ backgroundColor: colors.inputFill }}
            >
              <UserRound size={15} color={colors.textSecondary} />
            </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
