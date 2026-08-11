/**
 * Home — the daily landing screen ("Plan" tab).
 *
 * Aesthetic: a precision instrument with a warm heart. The dual-arc ring
 * (amber = whole program, mint = current level) is the centrepiece; everything
 * below is quieter and discoverable on scroll. A compact header fades in once
 * the greeting scrolls away.
 *
 * ALL data is live (see `useHomeData`) — /auth/me, /enrollments/me,
 * /enrollments/me/today, /programs/:id, /sessions/active, /sessions/calendar,
 * /sessions/trends, /programs?type=SHORT.
 *
 * The ONE exception is the wallet: it has no backend yet (the Subscription model
 * has no wallet/ledger), so it reads the provisional walletStore — the same
 * source the Wallet tab uses, so the two can't show different balances.
 */
import { useRouter } from 'expo-router';
import { Bell, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, Text, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BookConsultationSheet,
  DayCompleteCard,
  InsightCard,
  JourneyRow,
  LevelSegments,
  QuickSessionsRow,
  SectionHeader,
  SessionCard,
  SpecialistCard,
  StickyHeader,
  WalletCard,
  WarmRing,
  WeekCard,
} from '@/components/home';
import { dayAlreadyCompleted, useCompleteRestDay } from '@/features/enrollments/api';
import { useHomeData } from '@/features/home/useHomeData';
import { useNotifications } from '@/features/notifications/useNotifications';
import { resolveThumbnail } from '@/lib/media';
import { specialist } from '@/mocks/home';
import { LOW_BALANCE_INR, daysRemaining, useWalletStore } from '@/store/walletStore';
import { useThemeColors } from '@/theme/useTheme';

/** Fallback photo for a program day that has no thumbnail of its own yet. */
const SESSION_IMAGE =
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=80';

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const home = useHomeData();
  const restDay = useCompleteRestDay();
  const scrollY = useSharedValue(0);

  // Wallet is UI-only until the backend lands (see src/store/walletStore.ts).
  const walletBalance = useWalletStore((s) => s.balanceInr);
  const walletAutoRecharge = useWalletStore((s) => s.autoRecharge);
  const walletAutoRechargeAmount = useWalletStore((s) => s.autoRechargeAmount);
  const setWalletAutoRecharge = useWalletStore((s) => s.setAutoRecharge);
  const wallet = {
    balanceInr: walletBalance,
    estimatedDaysRemaining: daysRemaining(walletBalance),
    lowBalance: walletBalance <= LOW_BALANCE_INR,
    autoRecharge: walletAutoRecharge,
    autoRechargeAmount: walletAutoRechargeAmount,
  };

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const [booking, setBooking] = useState(false);
  const { actionableCount: alerts } = useNotifications();

  if (home.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (home.error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-base px-8">
        <Text className="text-center font-display-bold text-xl text-primary">
          We couldn&apos;t load your plan
        </Text>
        <Text className="mt-2 text-center font-sans text-sm text-secondary">
          Check your connection and try again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={home.refetch}
          className="mt-6 rounded-pill bg-accent px-6 py-3.5 active:opacity-90"
        >
          <Text className="font-sans-semibold text-sm" style={{ color: colors.accentText }}>
            Try again
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { me, enrollment, today, ring, levelProgress, insight } = home;
  // The enrolled program's own cover, when the clinic has uploaded one.
  const sessionImage = resolveThumbnail(home.program ?? {}) ?? SESSION_IMAGE;
  const firstName = me?.name?.split(' ')[0] ?? 'there';
  const isRestDay = today?.isRestDay ?? false;
  const canStart = !!today?.programDayId && !isRestDay;

  // One program day per calendar day. A session already in flight still wins —
  // the patient started it before the lock, so let them finish.
  const dayDone = !!today?.locked && !home.isResuming;

  const ctaLabel = home.isResuming
    ? 'Resume session'
    : isRestDay
      ? 'I rested today'
      : "Start today's session";

  const subtitle = home.isResuming
    ? `You're ${(home.activeSession?.currentExerciseIndex ?? 0) + 1} of ${
        home.totalExercises || '—'
      } exercises in — pick up where you left off.`
    : dayDone
      ? "You've done your session for today. Come back tomorrow for the next one."
      : isRestDay
        ? 'Rest and recover today. Your body is doing the work.'
        : today?.title
          ? `Ready for ${today.title.toLowerCase()}? You're doing great.`
          : 'Ready to move today?';

  return (
    <View className="flex-1 bg-base">
      <StickyHeader
        scrollY={scrollY}
        balanceLabel={`₹${wallet.balanceInr}`}
        onPressProfile={() => router.push('/(app)/(tabs)/profile')}
        onPressWallet={() => router.push('/(app)/(tabs)/wallet')}
        onPressAlerts={() => router.push('/(app)/(tabs)/notifications')}
        alertCount={alerts}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={home.isRefreshing}
              onRefresh={home.refetch}
              tintColor={colors.accent}
            />
          }
        >
          {/* Inline header — scrolls away, replaced by StickyHeader */}
          <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
            <View className="flex-row items-center gap-2.5">
              <View
                className="h-[34px] w-[34px] items-center justify-center rounded-pill"
                style={{ backgroundColor: colors.inputFill }}
              >
                <Text className="font-display-bold text-sm text-primary">
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text
                className="font-sans-bold text-[13px]"
                style={{ color: colors.accent, letterSpacing: 2 }}
              >
                SANCHARA
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <View
                className="rounded-pill px-3 py-2"
                style={{
                  backgroundColor: colors.inputFill,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text className="font-sans-semibold text-[13px] text-primary">
                  ₹{wallet.balanceInr}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  alerts > 0 ? `Notifications, ${alerts} need attention` : 'Notifications'
                }
                onPress={() => router.push('/(app)/(tabs)/notifications')}
                className="h-9 w-9 items-center justify-center rounded-pill active:opacity-70"
                style={{ backgroundColor: colors.inputFill }}
              >
                <Bell size={17} color={colors.textSecondary} />
                {alerts > 0 ? (
                  <View
                    className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-pill"
                    style={{ backgroundColor: colors.amber, borderWidth: 1.5, borderColor: colors.inputFill }}
                  />
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile"
                onPress={() => router.push('/(app)/(tabs)/profile')}
                className="h-9 w-9 items-center justify-center rounded-pill active:opacity-70"
                style={{ backgroundColor: colors.inputFill }}
              >
                <UserRound size={17} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Greeting */}
          <View className="px-5 pt-4">
            <Text className="font-display-bold text-3xl text-primary">
              {greetingFor(new Date())}, {firstName}
            </Text>
            <Text className="mt-1.5 font-sans text-[15px] leading-6 text-secondary">
              {subtitle}
            </Text>
          </View>

          {/* Enrolled-vs-not depends ONLY on the enrollment. Program CONTENT
              (levels) may be absent — flat programs — or still loading, and must
              never flip the user back to the "find a program" state. */}
          {enrollment && ring ? (
            <>
              {/* Ring + level roadmap bar */}
              <View className="items-center px-5 pb-1 pt-7">
                <WarmRing
                  overall={ring.overall}
                  level={levelProgress}
                  caption={ring.caption}
                  dayNumber={ring.dayNumber}
                  totalDays={ring.totalDays}
                  accessibilityText={ring.accessibilityText}
                />
                <View className="mt-7 w-full px-2">
                  <LevelSegments
                    totalLevels={Math.max(1, enrollment.totalLevels)}
                    currentLevel={enrollment.currentLevel}
                    currentProgress={levelProgress}
                  />
                </View>
              </View>

              {/* Today's session */}
              <View className="px-5 pt-7">
                {dayDone ? (
                  <DayCompleteCard unlocksOn={today?.unlocksOn} nextDayNumber={today?.dayNumber} />
                ) : today?.hasContent ? (
                  <SessionCard
                    title={today.title ?? `Day ${today.dayNumber}`}
                    tags={isRestDay ? ['REST DAY'] : ['RECOVERY', 'GENTLE']}
                    minutes={Math.max(
                      1,
                      Math.round(
                        today.exercises.reduce((s, e) => s + e.durationSeconds, 0) / 60,
                      ),
                    )}
                    exerciseCount={today.exercises.length}
                    imageUrl={sessionImage}
                    ctaLabel={ctaLabel}
                    busy={restDay.isPending}
                    onStart={() => {
                      if (isRestDay) {
                        restDay.mutate(undefined, {
                          onError: (err) => {
                            if (dayAlreadyCompleted(err)) {
                              Alert.alert(
                                "That's today done",
                                'Your next day opens tomorrow.',
                              );
                            }
                          },
                        });
                        return;
                      }
                      // Mid-workout already: skip the check-in and drop straight
                      // back where the server says they left off.
                      if (home.isResuming) {
                        router.push('/(session)/player');
                        return;
                      }
                      if (canStart && today?.programDayId) {
                        // Pain check-in first — the server owns the safety gate
                        // and won't create a session on a high score.
                        router.push({
                          pathname: '/(session)/checkin',
                          params: { programDayId: today.programDayId },
                        });
                      }
                    }}
                  />
                ) : (
                  <View className="rounded-card border border-border bg-surface p-6">
                    <Text className="font-display-bold text-lg text-primary">
                      Nothing scheduled yet
                    </Text>
                    <Text className="mt-1.5 font-sans text-sm text-secondary">
                      Day {today?.dayNumber ?? enrollment.currentDay} of this level hasn&apos;t been
                      published by your clinician yet.
                    </Text>
                  </View>
                )}
              </View>

              {/* Level roadmap.
                  Hidden for FLAT programmes, which genuinely have no levels —
                  but a FAILED programme fetch also yields zero levels, and
                  silently dropping the section there looks like a missing
                  feature rather than a network problem. */}
              {home.levels.length > 0 || home.levelsUnavailable ? (
                <View className="pt-8">
                  <View className="px-5">
                    <SectionHeader
                      label="YOUR JOURNEY"
                      actionLabel="View plan"
                      onAction={() => router.push('/(programs)')}
                    />
                  </View>
                  {home.levelsUnavailable ? (
                    <View className="px-5">
                      <Pressable
                        accessibilityRole="button"
                        onPress={home.retryProgram}
                        className="flex-row items-center rounded-card border border-border bg-surface p-4 active:opacity-80"
                      >
                        <Text className="flex-1 font-sans text-[13px] text-secondary">
                          Couldn&apos;t load your levels.
                        </Text>
                        <Text
                          className="font-sans-semibold text-[13px]"
                          style={{ color: colors.accent }}
                        >
                          Retry
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View className="pl-5">
                      <JourneyRow levels={home.levels} />
                    </View>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            /* Not enrolled */
            <View className="px-5 pt-8">
              <View className="rounded-card border border-border bg-surface p-6">
                <Text className="font-display-bold text-xl text-primary">
                  Let&apos;s find your program
                </Text>
                <Text className="mt-2 font-sans text-sm leading-5 text-secondary">
                  Pick a plan matched to your goal and pain areas, and we&apos;ll guide you day by
                  day.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/(programs)')}
                  className="mt-5 h-[52px] items-center justify-center rounded-pill bg-accent active:opacity-90"
                >
                  <Text
                    className="font-sans-semibold text-base"
                    style={{ color: colors.accentText }}
                  >
                    Find my program
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Week */}
          <View className="px-5 pt-8">
            <WeekCard
              days={home.week}
              currentMinutes={me?.weeklyActivity.currentMinutes ?? 0}
              targetMinutes={150}
            />
          </View>

          {/* Wallet — mock state until the backend lands */}
          <View className="px-5 pt-4">
            <WalletCard
              wallet={wallet}
              onAddMoney={() => router.push('/(app)/(tabs)/wallet')}
              onToggleAutoRecharge={setWalletAutoRecharge}
            />
          </View>

          {/* Progress insight — only once there's enough history to be honest */}
          {insight ? (
            <View className="px-5 pt-4">
              <InsightCard
                headline={insight.headline}
                delta={insight.delta}
                period={insight.period}
                series={insight.series}
              />
            </View>
          ) : null}

          {/* Short sessions */}
          {home.shortPrograms.length > 0 ? (
            <View className="pt-8">
              <View className="px-5">
                <SectionHeader label="ONLY GOT 5 MINUTES?" />
              </View>
              <View className="pl-5">
                <QuickSessionsRow
                  programs={home.shortPrograms}
                  onSelect={(id) => router.push(`/(programs)/${id}`)}
                />
              </View>
            </View>
          ) : null}

          {/* Specialist — static until consultations are built */}
          <View className="px-5 pt-8">
            <SpecialistCard
              name={specialist.name}
              title={specialist.title}
              avatar={specialist.avatar}
              onBook={() => setBooking(true)}
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      <BookConsultationSheet
        visible={booking}
        onClose={() => setBooking(false)}
        name={specialist.name}
        title={specialist.title}
        avatar={specialist.avatar}
      />
    </View>
  );
}
