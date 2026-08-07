// Program detail — about, focus/intensity, day-by-day structure, and enroll.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gauge, Moon, PersonStanding, Play } from 'lucide-react-native';
import { Alert, ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgramsHeader } from '@/components/programs/ProgramsHeader';
import { Button } from '@/components/ui';
import { isActiveEnrollmentConflict, useEnroll } from '@/features/enrollments/api';
import {
  useProgram,
  type DaySummary,
  type Difficulty,
  type PublicLevel,
} from '@/features/programs/api';
import { resolveThumbnail } from '@/lib/media';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'Beginner',
  MEDIUM: 'Optimal',
  HARD: 'Advanced',
};
const INTENSITY_LABEL: Record<Difficulty, string> = {
  EASY: 'Restorative',
  MEDIUM: 'Moderate',
  HARD: 'Intense',
};
/**
 * What the intensity means in practice — the hero pill already names the tier.
 * Kept to two words: the meta slot is one line in a half-width tile.
 */
const INTENSITY_NOTE: Record<Difficulty, string> = {
  EASY: 'Low impact',
  MEDIUM: 'Steady pace',
  HARD: 'Build phase',
};

function InfoPill({ label }: { label: string }) {
  const colors = useThemeColors();
  return (
    <View
      className="rounded-pill border border-border px-4 py-1.5"
      style={{ backgroundColor: withAlpha(colors.base, 0.4) }}
    >
      <Text className="font-sans-semibold text-xs uppercase tracking-wide text-secondary">
        {label}
      </Text>
    </View>
  );
}

/**
 * One of the two summary tiles under the description (Focus · Intensity).
 *
 * Both tiles are built to an IDENTICAL anatomy — icon chip, micro label, a
 * two-line value slot, a one-line meta slot — with the value and meta slots
 * given a fixed height. Content varies wildly between them (a program can carry
 * one target area or twenty-three), and without the reserved space the pair
 * renders visibly lopsided.
 */
function MetaCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  /** Overflow/qualifier line. The slot is reserved even when this is absent. */
  meta?: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 rounded-card border border-border bg-surface p-4">
      <View
        className="h-9 w-9 items-center justify-center rounded-pill"
        style={{ backgroundColor: withAlpha(colors.accent, 0.12) }}
      >
        <Icon color={colors.accent} size={19} />
      </View>
      <Text
        className="mt-3 font-sans-semibold text-[10px] uppercase"
        style={{ color: colors.microLabel, letterSpacing: 1.6 }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={2}
        className="mt-1.5 font-sans-semibold text-[15px] text-primary"
        style={{ lineHeight: 20, minHeight: 40 }}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className="font-sans text-[11px]"
        style={{ color: colors.microLabel, minHeight: 16 }}
      >
        {meta ?? ''}
      </Text>
    </View>
  );
}

/**
 * One tier of a leveled program, with its days beneath it.
 *
 * Day numbers restart inside every level (Level 2 begins again at Day 1), so
 * the level header is what makes the numbering legible — and rows must key on
 * the day id, not dayNumber, which repeats across levels.
 */
function LevelSection({ level }: { level: PublicLevel }) {
  const colors = useThemeColors();
  return (
    <View>
      <View className="mb-3 flex-row items-center gap-2">
        <Text
          className="font-sans-semibold text-[11px]"
          style={{ color: colors.accent, letterSpacing: 1.6 }}
        >
          LEVEL {String(level.levelNumber).padStart(2, '0')}
        </Text>
        {level.title ? (
          <Text
            numberOfLines={1}
            className="max-w-[45%] font-sans text-[11px]"
            style={{ color: colors.microLabel }}
          >
            · {level.title}
          </Text>
        ) : null}
        <View className="h-px flex-1" style={{ backgroundColor: colors.border }} />
        <Text className="font-sans text-[11px]" style={{ color: colors.microLabel }}>
          {level.dayCount} day{level.dayCount === 1 ? '' : 's'}
        </Text>
      </View>

      <View className="gap-3">
        {level.days.map((d) => (
          <DayRow key={d.id} day={d} />
        ))}
      </View>
    </View>
  );
}

function DayRow({ day }: { day: DaySummary }) {
  const colors = useThemeColors();
  if (day.isRestDay) {
    return (
      <View className="flex-row items-center rounded-card border border-dashed border-border px-4 py-4">
        <View className="h-10 w-10 items-center justify-center rounded-full border border-border">
          <Text className="font-sans-semibold text-sm text-micro">{day.dayNumber}</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="font-display-semibold text-base italic text-secondary">
            {day.title ?? 'Active Recovery'}
          </Text>
          <Text className="mt-0.5 font-sans text-xs text-micro">Rest Day · Body Listening</Text>
        </View>
        <Moon color={colors.microLabel} size={20} />
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-card border border-border bg-surface px-4 py-4">
      <View className="h-10 w-10 items-center justify-center rounded-full border border-accent">
        <Text className="font-sans-semibold text-sm text-accent">{day.dayNumber}</Text>
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-display-semibold text-base text-primary">
          {day.title ?? `Day ${day.dayNumber}`}
        </Text>
        <Text className="mt-0.5 font-sans text-xs text-micro">
          {day.exerciseCount} exercise{day.exerciseCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Play color={colors.accent} size={20} />
    </View>
  );
}

export default function ProgramDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: program, isLoading } = useProgram(id);
  const enroll = useEnroll();

  async function start(switchExisting?: boolean) {
    if (!id) return;
    try {
      await enroll.mutateAsync({ programId: id, switchExisting });
      router.replace('/(app)/(tabs)/home');
    } catch (e: unknown) {
      if (!switchExisting && isActiveEnrollmentConflict(e)) {
        Alert.alert(
          'Switch program?',
          'You already have an active program. Switching will pause it.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Switch', onPress: () => start(true) },
          ],
        );
        return;
      }
      Alert.alert('Could not start', 'Something went wrong. Please try again.');
    }
  }

  if (isLoading || !program) {
    return (
      <View className="flex-1 items-center justify-center bg-base">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const cover = resolveThumbnail(program);
  const prettify = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

  // Programs can carry a lot of target areas (clinicians tick many). Naming
  // them all turns the tile into a wall of commas, so lead with the first two
  // and count the rest.
  const areas = program.targetAreas.map(prettify);
  const focus = areas.length ? areas.slice(0, 2).join(', ') : 'Full body';
  const extraAreas = areas.length - 2;
  const focusMeta =
    extraAreas > 0 ? `+${extraAreas} more area${extraAreas === 1 ? '' : 's'}` : undefined;

  const intensity = program.difficultyLevel ? INTENSITY_LABEL[program.difficultyLevel] : 'Balanced';
  const intensityMeta = program.difficultyLevel
    ? INTENSITY_NOTE[program.difficultyLevel]
    : 'Not yet graded';

  // Flat programs (SHORT / catalog seed) have no ProgramLevel docs and put
  // everything in `days` instead.
  const hasLevels = program.levels.length > 0;

  return (
    <View className="flex-1 bg-base">
      <SafeAreaView edges={['top']}>
        <ProgramsHeader title="Programs" onBack={() => router.back()} />
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="h-80 w-full">
          {cover ? (
            <Image source={cover} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
          ) : null}
          <LinearGradient
            colors={[withAlpha(colors.base, 0.35), 'transparent', colors.base]}
            style={{ position: 'absolute', inset: 0 }}
          />

          <View className="absolute bottom-5 left-6 right-6">
            <View className="mb-3 flex-row gap-2">
              {program.difficultyLevel ? (
                <InfoPill label={`${DIFFICULTY_LABEL[program.difficultyLevel]} difficulty`} />
              ) : null}
              {program.durationDays ? <InfoPill label={`${program.durationDays} days`} /> : null}
            </View>
            <Text className="font-display-bold text-4xl text-primary">{program.name}</Text>
          </View>
        </View>

        {/* Body */}
        <View className="px-6 pt-6">
          <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
            About this program
          </Text>
          <Text className="mt-3 font-sans text-base leading-7 text-secondary">
            {program.description ?? 'A medically-supervised movement program tailored to your needs.'}
          </Text>

          <View className="mt-6 flex-row items-stretch gap-3">
            <MetaCard icon={PersonStanding} label="Focus" value={focus} meta={focusMeta} />
            <MetaCard icon={Gauge} label="Intensity" value={intensity} meta={intensityMeta} />
          </View>

          {/* Structure — Program → Level → Day. Leveled programs carry their
              days INSIDE `levels` and leave the flat `days` list empty, so
              rendering `days` alone showed nothing at all for them. */}
          <View className="mt-9 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
              Structure
            </Text>
            <Text className="font-sans text-xs uppercase tracking-wide text-micro">
              {hasLevels ? `${program.totalLevels} levels · ` : ''}
              {program.dayCount} days
            </Text>
          </View>

          {hasLevels ? (
            <View className="mt-5 gap-7">
              {program.levels.map((level) => (
                <LevelSection key={level.levelNumber} level={level} />
              ))}
            </View>
          ) : program.days.length > 0 ? (
            <View className="mt-4 gap-3">
              {program.days.map((d) => (
                <DayRow key={d.id} day={d} />
              ))}
            </View>
          ) : (
            <Text className="mt-4 font-sans text-sm leading-6 text-secondary">
              The day-by-day plan for this program is still being prepared.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Pinned CTA */}
      <View
        style={{ paddingBottom: insets.bottom + 10 }}
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-base px-6 pt-3"
      >
        <Button label="Start This Program" loading={enroll.isPending} onPress={() => start()} />
      </View>
    </View>
  );
}
