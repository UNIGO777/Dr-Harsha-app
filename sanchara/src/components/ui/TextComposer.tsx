/**
 * Full-screen dark text composer for long-form entry. The text area is pinned to
 * the top with the keyboard below, so it's always keyboard-responsive. The nav
 * bar has a proper "Done" button (top-right) that commits the text. Any exit
 * (Done, header chevron, hardware back) COMMITS via onDone — no accidental
 * discard.
 */
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResolvedTheme, useThemeColors } from '@/theme/useTheme';

interface TextComposerProps {
  visible: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  maxLength?: number;
  /** Called on every close (Done / chevron / back) with the current text. */
  onDone: (text: string) => void;
}

export function TextComposer({
  visible,
  title,
  initialValue,
  placeholder,
  maxLength = 2000,
  onDone,
}: TextComposerProps) {
  const colors = useThemeColors();
  const theme = useResolvedTheme();
  const [text, setText] = useState(initialValue);
  const inputRef = useRef<TextInput>(null);

  // Sync the draft each time the composer opens, and focus the field.
  useEffect(() => {
    if (visible) {
      setText(initialValue);
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onDone(text)}>
      <View className="flex-1 bg-base">
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            {/* Nav bar */}
            <View className="h-14 flex-row items-center justify-between border-b border-border px-4">
              <Pressable onPress={() => onDone(text)} hitSlop={12} className="w-10">
                <ChevronDown color={colors.textSecondary} size={26} />
              </Pressable>
              <Text className="font-sans-semibold text-base text-primary">{title}</Text>
              <Pressable onPress={() => onDone(text)} hitSlop={12}>
                <View className="rounded-pill bg-accent px-5 py-2">
                  <Text style={{ color: colors.accentText }} className="font-sans-semibold text-sm">
                    Done
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Text area */}
            <TextInput
              keyboardAppearance={theme}
              ref={inputRef}
              className="flex-1 px-5 pt-4 font-sans text-lg leading-7 text-primary"
              placeholder={placeholder}
              placeholderTextColor={colors.microLabel}
              selectionColor={colors.accent}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              maxLength={maxLength}
              scrollEnabled
            />
            <Text className="px-5 pb-3 text-right font-sans text-xs text-micro">
              {text.length}/{maxLength}
            </Text>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
