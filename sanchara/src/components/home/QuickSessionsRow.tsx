/**
 * QuickSessionsRow — standalone SHORT programs for a low-energy day. These log
 * minutes toward the weekly target but never touch enrollment progress, so a
 * hard day still counts for something.
 *
 * Fed by GET /programs?type=SHORT. Icon + tint are derived deterministically
 * from the program's index so the row stays visually varied without the backend
 * needing to carry presentation data.
 */
import * as Haptics from 'expo-haptics';
import { Flower2, PersonStanding, Wind } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { ProgramSummary } from '@/features/programs/api';
import { withAlpha, type Palette } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const ICONS = [Wind, PersonStanding, Flower2] as const;

// Tints are derived from the ACTIVE palette (not baked rgba), so the chips stay
// legible when the accent darkens in light mode.
const tintsFor = (c: Palette) =>
  [
    { fg: c.peri, bg: withAlpha(c.peri, 0.14) },
    { fg: c.amber, bg: withAlpha(c.amber, 0.14) },
    { fg: c.accent, bg: withAlpha(c.accent, 0.14) },
  ] as const;

export function QuickSessionsRow({
  programs,
  onSelect,
}: {
  programs: ProgramSummary[];
  onSelect: (id: string) => void;
}) {
  const colors = useThemeColors();
  const tints = tintsFor(colors);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 20 }}
    >
      {programs.map((program, index) => {
        const Icon = ICONS[index % ICONS.length]!;
        const tint = tints[index % tints.length]!;
        const area = program.targetAreas[0]?.replace(/_/g, ' ');

        return (
          <Pressable
            key={program.id}
            accessibilityRole="button"
            accessibilityLabel={`${program.name ?? 'Quick session'}${area ? `, ${area}` : ''}`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(program.id);
            }}
            className="w-[150px] rounded-card border border-border bg-surface p-4 active:opacity-80"
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-input"
              style={{ backgroundColor: tint.bg }}
            >
              <Icon size={21} color={tint.fg} />
            </View>
            <Text
              numberOfLines={1}
              className="mt-3 font-sans-semibold text-[15px] text-primary"
            >
              {program.name ?? 'Quick session'}
            </Text>
            {area ? (
              <Text
                numberOfLines={1}
                className="mt-1 font-sans text-xs capitalize"
                style={{ color: colors.microLabel }}
              >
                {area}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
