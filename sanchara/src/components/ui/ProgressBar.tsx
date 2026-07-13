/**
 * Thin onboarding progress bar. The fill width animates with Reanimated so step
 * transitions feel smooth. `step`/`total` drive it (e.g. 3 of 10).
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ProgressBarProps {
  step: number;
  total: number;
}

export function ProgressBar({ step, total }: ProgressBarProps) {
  const progress = useSharedValue(0);
  const target = total > 0 ? Math.min(Math.max(step / total, 0), 1) : 0;

  useEffect(() => {
    progress.value = withTiming(target, { duration: 350 });
  }, [target, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View className="h-1.5 w-full overflow-hidden rounded-pill bg-surface">
      <Animated.View className="h-full rounded-pill bg-accent" style={fillStyle} />
    </View>
  );
}
