/**
 * Change programme — browse and switch.
 *
 * Deliberately a BROWSER, not a picker. Switching plans moves a patient off the
 * course their clinician's day-by-day content is built around, so it routes
 * through the full programme detail page rather than committing on a tap in a
 * list: they get the focus areas, intensity, level structure and description
 * before they decide. That page already owns enrolling and the switch
 * confirmation, so there is exactly one place that logic lives.
 *
 * What this screen adds on top of the generic programme list is CONTEXT — the
 * "ON NOW" card, showing what they're on and exactly how far in, so the cost of
 * leaving is visible before they start shopping.
 *
 * Search runs SERVER-side, so it looks across every programme rather than only
 * the pages already pulled down — otherwise typing a name that happens to be on
 * page 3 returns nothing and reads as "we don't have it".
 */
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui';
import { ProgramCard } from '@/components/programs/ProgramCard';
import { useMyEnrollment } from '@/features/enrollments/api';
import { useProgramsInfinite } from '@/features/programs/api';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

export default function ChangeProgramScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const { data: plan } = useMyEnrollment();

  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');

  // Debounced: every keystroke would otherwise be a request, and a half-typed
  // word returns nothing, so the list would flash empty as they type.
  useEffect(() => {
    const t = setTimeout(() => setQuery(term.trim()), 350);
    return () => clearTimeout(t);
  }, [term]);

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProgramsInfinite(12, query ? { search: query } : undefined);

  // LONG programmes only: SHORT ones are standalone and the server rejects
  // enrolling in them, so offering them here would be a dead end.
  const programs = (data?.pages.flatMap((p) => p.data) ?? []).filter((p) => p.type !== 'SHORT');

  const position =
    plan == null
      ? ''
      : plan.totalLevels > 0
        ? `Level ${plan.currentLevel} · Day ${plan.currentDay}`
        : `Day ${plan.currentDay}`;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 py-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 active:opacity-70"
        >
          <ChevronLeft color={colors.accent} size={26} />
        </Pressable>
        <Text className="flex-1 text-center font-display-bold text-[17px] text-primary">
          Change programme
        </Text>
        <View className="w-10" />
      </View>

      {/* Search */}
      <View className="px-5 pb-1 pt-2">
        <View
          className="flex-row items-center rounded-pill px-4"
          style={{ backgroundColor: colors.inputFill, height: 48 }}
        >
          <Search color={colors.microLabel} size={18} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="Search programmes"
            placeholderTextColor={colors.microLabel}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search programmes"
            className="ml-2.5 flex-1 font-sans text-[15px]"
            style={{ color: colors.textPrimary }}
          />
          {term.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setTerm('')}
              hitSlop={10}
              className="active:opacity-70"
            >
              <X color={colors.microLabel} size={17} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load programmes" />
      ) : isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View className="pb-1 pt-2">
              {plan ? (
                <View
                  className="mb-4 rounded-card p-4"
                  style={{
                    backgroundColor: withAlpha(colors.accent, 0.1),
                    borderWidth: 1,
                    borderColor: withAlpha(colors.accent, 0.35),
                  }}
                >
                  <Text
                    className="font-sans-semibold text-[11px]"
                    style={{ color: colors.accent, letterSpacing: 1.4 }}
                  >
                    ON NOW
                  </Text>
                  <Text className="mt-1 font-display-bold text-[21px] text-primary">
                    {plan.program?.name ?? 'Your programme'}
                  </Text>
                  <Text className="mt-1 font-sans text-[13px] text-secondary">
                    {position} · {plan.percentComplete}% complete
                  </Text>
                </View>
              ) : null}

              <Text className="mb-1 font-sans text-[14px] leading-6 text-secondary">
                Switching pauses your current plan rather than deleting it. Come back to it whenever
                you like and you&apos;ll carry on from the same day.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text className="mt-10 text-center font-sans text-sm text-secondary">
              {query
                ? `Nothing matches “${query}”.`
                : 'No other programmes are available yet.'}
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
            ) : null
          }
          renderItem={({ item }) => {
            const isCurrent = item.id === plan?.programId;
            return (
              <View>
                {isCurrent ? (
                  <Text
                    className="mb-1.5 font-sans-semibold text-[11px]"
                    style={{ color: colors.accent, letterSpacing: 1.4 }}
                  >
                    YOUR CURRENT PROGRAMME
                  </Text>
                ) : null}
                <ProgramCard
                  program={item}
                  onPress={() => router.push(`/(programs)/${item.id}`)}
                />
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
