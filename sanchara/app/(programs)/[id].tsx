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
import { useProgram, type Difficulty, type DaySummary } from '@/features/programs/api';
import { colors } from '@/theme/tokens';

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

function InfoPill({ label }: { label: string }) {
  return (
    <View className="rounded-pill border border-border bg-black/40 px-4 py-1.5">
      <Text className="font-sans-semibold text-xs uppercase tracking-wide text-secondary">
        {label}
      </Text>
    </View>
  );
}

function FocusCard({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <View className="flex-1 rounded-card border border-border bg-surface p-4">
      <Icon color={colors.accent} size={22} />
      <Text className="mt-3 font-sans text-xs uppercase tracking-[2px] text-micro">{label}</Text>
      <Text className="mt-1 font-sans-semibold text-base text-primary">{value}</Text>
    </View>
  );
}

function DayRow({ day }: { day: DaySummary }) {
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

  const prettify = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const focus = program.targetAreas.length
    ? program.targetAreas.map(prettify).join(', ')
    : 'Full body';
  const intensity = program.difficultyLevel ? INTENSITY_LABEL[program.difficultyLevel] : 'Balanced';

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
          {program.thumbnailUrl ? (
            <Image source={program.thumbnailUrl} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
          ) : null}
          <LinearGradient
            colors={['rgba(11,11,12,0.35)', 'transparent', colors.base]}
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

          <View className="mt-6 flex-row gap-4">
            <FocusCard icon={PersonStanding} label="Focus" value={focus} />
            <FocusCard icon={Gauge} label="Intensity" value={intensity} />
          </View>

          {/* Structure */}
          <View className="mt-9 flex-row items-center justify-between">
            <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
              Structure
            </Text>
            <Text className="font-sans text-xs uppercase tracking-wide text-micro">
              {program.dayCount} days
            </Text>
          </View>
          <View className="mt-4 gap-3">
            {program.days.map((d) => (
              <DayRow key={d.dayNumber} day={d} />
            ))}
          </View>
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
