/**
 * Static header shared by the program list + program detail screens. Stays fixed
 * at the top (doesn't scroll). Shows a back chevron when `onBack` is provided
 * (detail), otherwise just the title (list).
 */
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function ProgramsHeader({ title = 'Programs', onBack }: { title?: string; onBack?: () => void }) {
  return (
    <View className="h-14 flex-row items-center border-b border-border bg-base px-4">
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} className="mr-1 h-10 w-10 justify-center">
          <ChevronLeft color={colors.accent} size={26} />
        </Pressable>
      ) : (
        <View className="w-2" />
      )}
      <Text className="font-display-semibold text-xl text-primary">{title}</Text>
    </View>
  );
}
