/**
 * Notifications.
 *
 * Everything here is derived from live state (see useNotifications) rather than
 * stored server-side — there is no notifications module yet. That constraint is
 * actually a feature: nothing shown is stale, and every item links to the thing
 * it is about.
 *
 * Sorted by what the patient should act on first: warnings, then actions, then
 * information. A trial about to lapse outranks a level-up badge.
 */
import { useRouter } from 'expo-router';
import {
  BellOff,
  Check,
  Info,
  Moon,
  Play,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui';
import { useNotifications, type Notice, type NoticeTone } from '@/features/notifications/useNotifications';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const ICONS = {
  play: Play,
  moon: Moon,
  check: Check,
  shield: ShieldCheck,
  wallet: Wallet,
  trend: TrendingUp,
  trophy: Trophy,
} as const;

/** Warnings first, then things to do, then FYI. */
const ORDER: Record<NoticeTone, number> = { warning: 0, action: 1, info: 2 };

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { notices, isPending, isRefreshing, refetch } = useNotifications();

  const toneColor = (tone: NoticeTone) =>
    tone === 'warning' ? colors.amber : tone === 'action' ? colors.accent : colors.microLabel;

  const sorted = [...notices].sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <ScreenHeader title="Notifications" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScreenHeader title="Notifications" />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        {sorted.length === 0 ? (
          <View className="mt-10 items-center px-4">
            <View
              className="h-16 w-16 items-center justify-center rounded-pill"
              style={{ backgroundColor: colors.inputFill }}
            >
              <BellOff color={colors.microLabel} size={28} />
            </View>
            <Text className="mt-5 text-center font-display-bold text-xl text-primary">
              You&apos;re all caught up
            </Text>
            <Text className="mt-2 text-center font-sans text-[15px] leading-6 text-secondary">
              Reminders about your sessions, your wallet and your pain trends will appear here.
            </Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {sorted.map((n: Notice) => {
              const Icon = ICONS[n.icon];
              const tint = toneColor(n.tone);
              const tappable = !!n.href;

              return (
                <Pressable
                  key={n.id}
                  accessibilityRole={tappable ? 'button' : 'text'}
                  disabled={!tappable}
                  onPress={() => n.href && router.push(n.href as never)}
                  className={`flex-row rounded-card border p-4 ${tappable ? 'active:opacity-80' : ''}`}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: n.tone === 'info' ? colors.border : withAlpha(tint, 0.4),
                  }}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-pill"
                    style={{ backgroundColor: withAlpha(tint, 0.14) }}
                  >
                    <Icon color={tint} size={19} />
                  </View>

                  <View className="ml-3.5 flex-1">
                    <Text className="font-sans-semibold text-[15px] text-primary">{n.title}</Text>
                    <Text className="mt-1 font-sans text-[13px] leading-5 text-secondary">
                      {n.body}
                    </Text>
                    {n.cta ? (
                      <Text
                        className="mt-2.5 font-sans-semibold text-[13px]"
                        style={{ color: tint }}
                      >
                        {n.cta} →
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Honest about what isn't built */}
        <View
          className="mt-6 flex-row items-start rounded-card p-4"
          style={{ backgroundColor: colors.inputFill }}
        >
          <Info color={colors.microLabel} size={15} />
          <Text
            className="ml-2.5 flex-1 font-sans text-[12px] leading-[18px]"
            style={{ color: colors.microLabel }}
          >
            These update live from your plan. Push notifications to your phone aren&apos;t switched
            on yet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
