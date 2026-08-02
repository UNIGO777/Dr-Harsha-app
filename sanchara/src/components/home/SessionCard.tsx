/**
 * SessionCard — today's workout as a photograph with the primary CTA sitting on
 * top of it. The image is what keeps the screen human; the gradient scrim keeps
 * the title legible over any photo, and doubles as the fallback look if the
 * image fails to load.
 */
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Play } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

interface SessionCardProps {
  title: string;
  tags: string[];
  minutes: number;
  exerciseCount: number;
  imageUrl: string;
  ctaLabel: string;
  /** Disables the CTA and shows a spinner while a mutation is in flight. */
  busy?: boolean;
  onStart: () => void;
}

export function SessionCard({
  title,
  tags,
  minutes,
  exerciseCount,
  imageUrl,
  ctaLabel,
  busy = false,
  onStart,
}: SessionCardProps) {
  return (
    <View className="overflow-hidden rounded-card border border-border bg-surface">
      <View className="h-52 w-full">
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={400}
        />
        {/* Scrim: keeps text readable and carries the design if the photo 404s. */}
        <LinearGradient
          colors={['rgba(11,11,12,0.15)', 'rgba(11,11,12,0.55)', 'rgba(11,11,12,0.96)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
          <View className="flex-row gap-2">
            {tags.map((tag) => (
              <View
                key={tag}
                className="rounded-pill px-2.5 py-1"
                style={{ backgroundColor: 'rgba(11,11,12,0.55)' }}
              >
                <Text
                  className="font-sans-semibold text-[10px]"
                  style={{ color: colors.accent, letterSpacing: 1 }}
                >
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          <Text
            className="font-sans-semibold text-[11px]"
            style={{ color: colors.textSecondary, letterSpacing: 1 }}
          >
            {minutes} MIN
          </Text>
        </View>

        <View className="absolute bottom-4 left-4 right-4">
          <Text className="font-display-bold text-2xl text-primary">{title}</Text>
          <Text className="mt-0.5 font-sans text-sm text-secondary">
            {exerciseCount} exercises
          </Text>
        </View>
      </View>

      <View className="p-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onStart();
          }}
          className={`h-[58px] w-full flex-row items-center justify-center gap-2 rounded-pill bg-accent ${
            busy ? 'opacity-60' : 'active:opacity-90'
          }`}
          style={{
            shadowColor: colors.accent,
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <>
              <Play size={18} color={colors.accentText} fill={colors.accentText} />
              <Text
                className="font-sans-semibold text-base"
                style={{ color: colors.accentText }}
              >
                {ctaLabel}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
