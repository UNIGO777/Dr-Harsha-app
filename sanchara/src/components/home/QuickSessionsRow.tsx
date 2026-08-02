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
import { colors } from '@/theme/tokens';

const ICONS = [Wind, PersonStanding, Flower2] as const;

const TINTS = [
  { fg: colors.peri, bg: 'rgba(139,155,240,0.14)' },
  { fg: colors.amber, bg: 'rgba(245,196,107,0.14)' },
  { fg: colors.accent, bg: 'rgba(79,224,172,0.14)' },
] as const;

export function QuickSessionsRow({
  programs,
  onSelect,
}: {
  programs: ProgramSummary[];
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 20 }}
    >
      {programs.map((program, index) => {
        const Icon = ICONS[index % ICONS.length]!;
        const tint = TINTS[index % TINTS.length]!;
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
