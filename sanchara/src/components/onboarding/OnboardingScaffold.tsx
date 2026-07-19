/**
 * Cinematic onboarding wrapper used by every step. Layout (top → bottom):
 *   - top bar: back chevron · "STEP n OF 10" · close (X)
 *   - segmented progress
 *   - FIXED title + subtitle (kept out of the scroll area so a long title can
 *     never scroll under the progress bar)
 *   - scrollable content (children)
 *   - optional `aboveCta` slot, then the pinned Continue button + footer note
 */
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { ONBOARDING_TOTAL_STEPS } from '@/features/onboarding/steps';
import { colors } from '@/theme/tokens';

interface OnboardingScaffoldProps {
  step: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** Optional full-bleed background image (added when photo assets are ready). */
  image?: ImageSource;
  ctaLabel?: string;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  onContinue: () => void;
  /** Rendered fixed, directly above the Continue button (e.g. selected chips). */
  aboveCta?: ReactNode;
  footerNote?: string;
  onBack?: () => void;
  onClose?: () => void;
}

function SegmentedProgress({ step, total }: { step: number; total: number }) {
  return (
    <View className="mt-4 flex-row gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-pill ${i < step ? 'bg-accent' : 'bg-surface'}`}
        />
      ))}
    </View>
  );
}

export function OnboardingScaffold({
  step,
  title,
  subtitle,
  children,
  image,
  ctaLabel = 'Continue',
  ctaLoading = false,
  ctaDisabled = false,
  onContinue,
  aboveCta,
  footerNote,
  onBack,
  onClose,
}: OnboardingScaffoldProps) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-base">
      {image ? (
        <Image source={image} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
      ) : null}
      <LinearGradient
        colors={
          image
            ? ['rgba(11,11,12,0.25)', 'rgba(11,11,12,0.75)', colors.base]
            : ['rgba(105,209,192,0.07)', 'transparent', colors.base]
        }
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', inset: 0 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 px-6"
        >
          {/* Top bar */}
          <View className="h-10 flex-row items-center justify-between">
            <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12} className="w-10">
              <ChevronLeft color={colors.accent} size={26} />
            </Pressable>
            <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
              Step {step} of {ONBOARDING_TOTAL_STEPS}
            </Text>
            <Pressable
              onPress={onClose ?? (() => router.replace('/'))}
              hitSlop={12}
              className="w-10 items-end"
            >
              <X color={colors.textSecondary} size={24} />
            </Pressable>
          </View>

          <SegmentedProgress step={step} total={ONBOARDING_TOTAL_STEPS} />

          {/* Fixed title */}
          <View className="mt-8">
            <Text className="font-display-bold text-4xl leading-[42px] text-primary">{title}</Text>
            {subtitle ? (
              <Text className="mt-3 font-sans text-base leading-6 text-secondary">{subtitle}</Text>
            ) : null}
          </View>

          {/* Scrollable content */}
          <ScrollView
            className="mt-6 flex-1"
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Fixed footer */}
          <View className="pb-2 pt-2">
            {aboveCta}
            <Button
              label={ctaLabel}
              loading={ctaLoading}
              disabled={ctaDisabled}
              onPress={onContinue}
            />
            {footerNote ? (
              <Text className="mt-3 text-center font-sans text-xs text-micro">{footerNote}</Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
