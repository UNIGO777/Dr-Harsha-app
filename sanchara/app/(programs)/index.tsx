// Program selection — recommended hero + browse all programs. The list loads in
// chunks as you scroll (infinite scroll) rather than all at once. Shown after
// onboarding; the user must pick a program here before the dashboard unlocks.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgramCard } from '@/components/programs/ProgramCard';
import { ProgramsHeader } from '@/components/programs/ProgramsHeader';
import { Chip } from '@/components/ui';
import { resolveThumbnail } from '@/lib/media';
import {
  useProgramsInfinite,
  useRecommendedPrograms,
  type ProgramSummary,
  type Recommendation,
} from '@/features/programs/api';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

function RecommendedHero({ rec, onPress }: { rec: Recommendation; onPress: () => void }) {
  const colors = useThemeColors();
  const { program } = rec;
  const cover = resolveThumbnail(program);
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-card border border-border bg-surface active:opacity-90"
    >
      {cover ? (
        <Image source={cover} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
      ) : null}
      {/* Fades the photo into the PAGE colour, so the same overlay reads
          correctly whether the canvas behind it is near-black or off-white. */}
      <LinearGradient
        colors={[withAlpha(colors.accent, 0.1), 'transparent', withAlpha(colors.base, 0.65)]}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View className="p-5">
        <View className="flex-row items-center">
          <View className="mr-2 h-2 w-2 rounded-full bg-accent" />
          <Text className="font-sans-semibold text-xs uppercase tracking-[1.5px] text-accent">
            {program.durationDays ? `${program.durationDays} days program` : 'Program'}
          </Text>
        </View>
        <Text className="mt-2 font-display-bold text-3xl text-primary">{program.name}</Text>
        <Text numberOfLines={3} className="mt-2 font-sans text-base leading-6 text-secondary">
          {rec.matchReason}.{program.description ? ` ${program.description}` : ''}
        </Text>
        <View className="mt-5 h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Play color={colors.accentText} size={24} fill={colors.accentText} />
        </View>
      </View>
    </Pressable>
  );
}

export default function ProgramSelectScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recommended = useRecommendedPrograms();
  const list = useProgramsInfinite(12);
  const [goal, setGoal] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const allPrograms = useMemo<ProgramSummary[]>(
    () => list.data?.pages.flatMap((p) => p.data) ?? [],
    [list.data],
  );

  const goalTags = useMemo(() => {
    const set = new Set<string>();
    allPrograms.forEach((p) => p.goalTag.forEach((g) => set.add(g)));
    return Array.from(set);
  }, [allPrograms]);

  const filtered = useMemo(
    () => (goal ? allPrograms.filter((p) => p.goalTag.includes(goal)) : allPrograms),
    [allPrograms, goal],
  );

  const open = (id: string) => router.push(`/(programs)/${id}`);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([recommended.refetch(), list.refetch()]);
    setRefreshing(false);
  }, [recommended, list]);

  const onEndReached = useCallback(() => {
    if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  }, [list]);

  const initialLoading = recommended.isLoading || list.isLoading;

  const Header = (
    <View>
      <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
        Recommended for you
      </Text>
      <Text className="mt-2 font-display-bold text-4xl leading-[44px] text-primary">
        Your path to better movement starts here.
      </Text>

      {recommended.data && recommended.data.length > 0 ? (
        <View className="mt-6">
          <RecommendedHero rec={recommended.data[0]} onPress={() => open(recommended.data![0].program.id)} />
        </View>
      ) : null}

      <Text className="mt-10 font-display-semibold text-2xl text-primary">Explore programs</Text>

      {goalTags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        >
          <Chip label="All" selected={goal === null} onPress={() => setGoal(null)} />
          {goalTags.map((g) => (
            <Chip key={g} label={g} selected={goal === g} onPress={() => setGoal(g)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  if (initialLoading) {
    return (
      <View className="flex-1 bg-base">
        <SafeAreaView edges={['top']}>
          <ProgramsHeader title="Programs" />
        </SafeAreaView>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-base">
      <SafeAreaView edges={['top']}>
        <ProgramsHeader title="Programs" />
      </SafeAreaView>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProgramCard program={item} onPress={() => open(item.id)} />}
        ListHeaderComponent={Header}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 40,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text className="mt-6 text-center font-sans text-sm text-secondary">
            No programs found. Try a different filter.
          </Text>
        }
      />
    </View>
  );
}
