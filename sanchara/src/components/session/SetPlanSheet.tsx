/**
 * SetPlanSheet — how many reps, and how long to rest.
 *
 * Shown before the first set of an exercise and reachable again from the
 * player, because the right load is something a patient discovers by trying it,
 * not something they can pick correctly up front.
 *
 * The schemes are shown as their actual numbers (10, 10, 10) rather than
 * labelled "easy/medium/hard": 15-12-10 is a pyramid, not a difficulty tier,
 * and hiding that behind an adjective would misrepresent it.
 */
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import {
  REP_SCHEMES,
  REP_SCHEME_IDS,
  REST_PRESETS,
  type RepSchemeId,
  type RestPreset,
} from '@/lib/enums';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface SetPlanSheetProps {
  visible: boolean;
  exerciseTitle: string;
  scheme: RepSchemeId;
  rest: RestPreset;
  onChangeScheme: (s: RepSchemeId) => void;
  onChangeRest: (r: RestPreset) => void;
  onClose: () => void;
  /** Label for the confirm button — "Start set 1" or "Save". */
  confirmLabel: string;
}

const REST_LABEL: Record<number, string> = {
  60: 'Standard',
  120: 'Longer',
  180: 'Longest',
};

export function SetPlanSheet({
  visible,
  exerciseTitle,
  scheme,
  rest,
  onChangeScheme,
  onChangeRest,
  onClose,
  confirmLabel,
}: SetPlanSheetProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable className="flex-1" accessibilityLabel="Close" onPress={onClose} />

        <View
          className="rounded-t-[28px] px-6 pb-8 pt-5"
          style={{ backgroundColor: colors.base, maxHeight: '85%' }}
        >
          <View className="items-center">
            <View className="h-1 w-10 rounded-pill" style={{ backgroundColor: colors.border }} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={10}
            className="absolute right-5 top-5 h-8 w-8 items-center justify-center rounded-pill active:opacity-70"
            style={{ backgroundColor: colors.inputFill }}
          >
            <X color={colors.textSecondary} size={16} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mt-4 font-display-bold text-2xl text-primary">Your sets</Text>
            <Text numberOfLines={1} className="mt-1 font-sans text-[13px]" style={{ color: colors.microLabel }}>
              {exerciseTitle}
            </Text>

            {/* Reps */}
            <Text
              className="mb-2.5 mt-7 font-sans-semibold text-[11px]"
              style={{ color: colors.microLabel, letterSpacing: 1.6 }}
            >
              REPS AND SETS
            </Text>
            <View className="gap-2">
              {REP_SCHEME_IDS.map((id) => {
                const reps = REP_SCHEMES[id];
                const selected = scheme === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${reps.length} sets of ${reps.join(', ')} reps`}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      onChangeScheme(id);
                    }}
                    className="flex-row items-center rounded-input px-4 py-4 active:opacity-80"
                    style={{
                      backgroundColor: selected ? withAlpha(colors.accent, 0.1) : colors.surface,
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
                    <View className="ml-3 flex-1">
                      <Text className="font-sans-semibold text-[16px] text-primary">{id}</Text>
                      <Text className="mt-0.5 font-sans text-[12px]" style={{ color: colors.microLabel }}>
                        {reps.length} sets · {reps.reduce((a, b) => a + b, 0)} reps in total
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Rest */}
            <Text
              className="mb-2.5 mt-7 font-sans-semibold text-[11px]"
              style={{ color: colors.microLabel, letterSpacing: 1.6 }}
            >
              REST BETWEEN SETS
            </Text>
            <View className="flex-row gap-2">
              {REST_PRESETS.map((r) => {
                const selected = rest === r;
                return (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      onChangeRest(r);
                    }}
                    className="flex-1 items-center rounded-input py-4 active:opacity-80"
                    style={{
                      backgroundColor: selected ? withAlpha(colors.accent, 0.1) : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                    }}
                  >
                    <Text
                      className="font-sans-semibold text-[16px]"
                      style={{ color: selected ? colors.accent : colors.textPrimary }}
                    >
                      {r < 60 ? `${r}s` : `${r / 60} min`}
                    </Text>
                    <Text className="mt-0.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
                      {REST_LABEL[r]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-2 font-sans text-[11px]" style={{ color: colors.microLabel }}>
              You can change this any time during the exercise.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="mt-8 h-[58px] w-full items-center justify-center rounded-pill active:opacity-90"
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="font-sans-semibold text-base" style={{ color: colors.accentText }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
