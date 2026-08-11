/**
 * Edit health context.
 *
 * Pain areas matter most here: they are the exact list the session check-in
 * asks about, and the server REJECTS a check-in naming an area that isn't on
 * the profile. So editing this list directly changes what the patient is asked
 * before every workout — hence the note, and hence the same label vocabulary as
 * onboarding (values are stored as labels like "Lower back", not ids).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { REGION_LABELS } from '@/components/onboarding/BodyMap';
import { EditScaffold } from '@/components/profile/EditScaffold';
import { Input } from '@/components/ui';
import { useMe, useUpdateMe, type UpdateMyProfileInput } from '@/features/auth/api';
import { EXERCISE_HISTORY_LEVELS, type ExerciseHistoryLevel } from '@/lib/enums';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const COMMON_CONDITIONS = [
  'Diabetes',
  'High blood pressure / Hypertension',
  'Brain or neurological condition',
  'Heart condition',
  'High cholesterol',
  'Asthma or other breathing condition',
  'Thyroid condition',
  'Bone-related condition',
  'Joint-related condition',
  'Previous injury',
];

const ACTIVITY_LABEL: Record<ExerciseHistoryLevel, string> = {
  none: 'Not active',
  beginner: 'Beginner',
  sports_only: 'I play sports',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Every anatomical label onboarding offers, in the same order. */
const PAIN_AREA_LABELS = Object.values(REGION_LABELS);

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="rounded-pill px-3.5 py-2.5 active:opacity-80"
      style={{
        backgroundColor: selected ? withAlpha(colors.accent, 0.14) : colors.inputFill,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
      }}
    >
      <Text
        className="font-sans-medium text-[13px]"
        style={{ color: selected ? colors.accent : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function EditHealthScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const me = useMe();
  const update = useUpdateMe();

  const user = me.data;
  const [painAreas, setPainAreas] = useState<string[]>(user?.painAreas ?? []);
  const [conditions, setConditions] = useState<string[]>(user?.conditions ?? []);
  const [activity, setActivity] = useState<ExerciseHistoryLevel | undefined>(user?.exerciseHistory);
  const [goal, setGoal] = useState(user?.goal ?? '');
  const [surgery, setSurgery] = useState(user?.surgeryHistory ?? '');

  const dirty =
    !sameSet(painAreas, user?.painAreas ?? []) ||
    !sameSet(conditions, user?.conditions ?? []) ||
    activity !== user?.exerciseHistory ||
    goal !== (user?.goal ?? '') ||
    surgery !== (user?.surgeryHistory ?? '');

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  async function save() {
    if (painAreas.length === 0) {
      Alert.alert(
        'Add at least one area',
        'Your pre-session check-in asks about these, so we need at least one.',
      );
      return;
    }

    const patch: UpdateMyProfileInput = {};
    if (!sameSet(painAreas, user?.painAreas ?? [])) patch.painAreas = painAreas;
    if (!sameSet(conditions, user?.conditions ?? [])) patch.conditions = conditions;
    if (activity !== user?.exerciseHistory) patch.exerciseHistory = activity;
    if (goal !== (user?.goal ?? '')) patch.goal = goal.trim() || undefined;
    if (surgery !== (user?.surgeryHistory ?? '')) patch.surgeryHistory = surgery.trim() || undefined;

    try {
      await update.mutateAsync(patch);
      router.back();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  return (
    <EditScaffold
      title="Health"
      subtitle="This shapes which exercises you're given and what we ask before each session."
      dirty={dirty}
      saving={update.isPending}
      onSave={save}
    >
      <Text className="font-sans-semibold text-[15px] text-primary">Where do you feel pain?</Text>
      <Text className="mt-1 font-sans text-[13px] leading-5" style={{ color: colors.microLabel }}>
        You&apos;ll be asked to rate each of these before every session.
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {PAIN_AREA_LABELS.map((label) => (
          <Chip
            key={label}
            label={label}
            selected={painAreas.includes(label)}
            onPress={() => toggle(painAreas, setPainAreas, label)}
          />
        ))}
      </View>

      <Text className="mt-8 font-sans-semibold text-[15px] text-primary">
        Any ongoing conditions?
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {COMMON_CONDITIONS.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={conditions.includes(c)}
            onPress={() => toggle(conditions, setConditions, c)}
          />
        ))}
      </View>

      <Text className="mt-8 font-sans-semibold text-[15px] text-primary">
        How active are you right now?
      </Text>
      <View className="mt-3 gap-2">
        {EXERCISE_HISTORY_LEVELS.map((level) => {
          const selected = activity === level;
          return (
            <Pressable
              key={level}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setActivity(level)}
              className="flex-row items-center rounded-input px-4 py-3.5 active:opacity-80"
              style={{
                backgroundColor: colors.inputFill,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.border,
              }}
            >
              <View
                className="h-4 w-4 rounded-pill"
                style={{
                  borderWidth: 2,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accent : 'transparent',
                }}
              />
              <Text
                className="ml-3 font-sans-medium text-[14px]"
                style={{ color: selected ? colors.textPrimary : colors.textSecondary }}
              >
                {ACTIVITY_LABEL[level]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-8 gap-5">
        <Input
          label="Your goal"
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g. Walk without back pain"
        />
        <Input
          label="Past surgery (optional)"
          value={surgery}
          onChangeText={setSurgery}
          placeholder="e.g. Knee replacement, 2021"
          multiline
        />
      </View>
    </EditScaffold>
  );
}
