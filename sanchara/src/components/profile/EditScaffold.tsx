/**
 * Shared chrome for the profile edit screens: back chevron, title, scrollable
 * body, pinned Save.
 *
 * Save stays disabled until something actually changed, so the button doubles
 * as the "are there unsaved edits?" indicator — and backing out with pending
 * changes asks first rather than discarding them silently.
 */
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ScreenHeader } from '@/components/ui';

interface EditScaffoldProps {
  title: string;
  subtitle?: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  children: ReactNode;
}

export function EditScaffold({
  title,
  subtitle,
  dirty,
  saving,
  onSave,
  children,
}: EditScaffoldProps) {
  const router = useRouter();

  function leave() {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', "Your edits won't be saved.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Same fixed bar as the rest of the profile section — the title stays
            visible while a long form scrolls, and back is always reachable. */}
        <ScreenHeader title={title} onBack={leave} />

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {subtitle ? (
            <Text className="mt-5 font-sans text-[15px] leading-6 text-secondary">{subtitle}</Text>
          ) : null}

          <View className={subtitle ? 'mt-7' : 'mt-6'}>{children}</View>
        </ScrollView>

        <View className="px-6 pb-4 pt-2">
          <Button label="Save changes" disabled={!dirty} loading={saving} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
