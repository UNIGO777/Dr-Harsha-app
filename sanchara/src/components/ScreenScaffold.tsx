/**
 * Dev placeholder scaffold for not-yet-built route screens. Keeps every stub
 * on-theme (base background, Fraunces title, Inter meta) so the navigation
 * skeleton is visually coherent while feature work lands screen by screen.
 */
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenScaffoldProps {
  title: string;
  group?: string;
}

export function ScreenScaffold({ title, group }: ScreenScaffoldProps) {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <View className="flex-1 items-center justify-center px-6">
        {group ? (
          <Text className="mb-3 font-sans text-xs uppercase tracking-[3px] text-micro">
            {group}
          </Text>
        ) : null}
        <Text className="text-center font-display-semibold text-3xl text-primary">{title}</Text>
        <Text className="mt-3 text-center font-sans text-sm text-secondary">
          Placeholder screen — wiring only, no feature logic yet.
        </Text>
      </View>
    </SafeAreaView>
  );
}
