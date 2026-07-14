// Phone entry — collects the mobile number and requests an OTP from the backend.
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageSquareText } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandFooter } from '@/components/BrandFooter';
import { Button } from '@/components/ui';
import { useRequestOtp } from '@/features/auth/api';
import { BRAND, LEGAL_LINKS } from '@/lib/brand';
import { colors } from '@/theme/tokens';

/** "9876543210" -> "98765 43210" for display. */
function groupPhone(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Pull a human message out of an axios error, else fall back. */
function extractApiError(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}

export default function PhoneEntryScreen() {
  const router = useRouter();
  const requestOtp = useRequestOtp();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValid = digits.length === 10;
  const fullPhone = `${BRAND.countryCode}${digits}`;

  async function onSubmit() {
    if (!isValid) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    try {
      await requestOtp.mutateAsync(fullPhone);
      router.push({ pathname: '/(auth)/otp', params: { phone: fullPhone } });
    } catch (e: unknown) {
      setError(extractApiError(e, 'Could not send the code. Please try again.'));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 px-6"
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} hitSlop={12} className="h-10 w-10 justify-center">
          <ChevronLeft color={colors.accent} size={28} />
        </Pressable>

        {/* Main content — vertically centered */}
        <View className="flex-1 justify-center">
          <View className="items-center">
            <View className="mb-8 h-14 w-14 items-center justify-center rounded-2xl bg-surface">
              <MessageSquareText color={colors.accent} size={26} strokeWidth={2} />
            </View>
            <Text className="text-center font-display-semibold text-3xl text-primary">
              Let&apos;s get you moving
            </Text>
            <Text className="mt-3 text-center font-sans text-base leading-6 text-secondary">
              Enter your number and we&apos;ll text you{'\n'}a code to sign in.
            </Text>
          </View>

          {/* Phone field */}
          <View className="mt-10">
            <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">
              Phone number
            </Text>
            <View
              className={`h-16 flex-row items-center rounded-input border bg-input-fill px-4 ${
                error ? 'border-danger' : 'border-border'
              }`}
            >
              <Text style={{ color: colors.accent }} className="font-sans-semibold text-base">
                {BRAND.countryCode}
              </Text>
              <View className="mx-3 h-6 w-px bg-border" />
              <TextInput
                className="flex-1 font-sans text-base text-primary"
                placeholder="98765 43210"
                placeholderTextColor={colors.microLabel}
                selectionColor={colors.accent}
                keyboardType="number-pad"
                textContentType="telephoneNumber"
                value={groupPhone(digits)}
                onChangeText={(t) => {
                  setDigits(t.replace(/\D/g, '').slice(0, 10));
                  if (error) setError(null);
                }}
                maxLength={11}
              />
            </View>
            {error ? <Text className="mt-2 font-sans text-xs text-danger">{error}</Text> : null}

            <View className="mt-5">
              <Button label="Send code" loading={requestOtp.isPending} onPress={onSubmit} />
            </View>

            <Text className="mt-5 text-center font-sans text-xs leading-5 text-micro">
              By continuing you agree to our{' '}
              <Text className="text-secondary underline">{LEGAL_LINKS[0].label}</Text> &amp;{' '}
              <Text className="text-secondary underline">{LEGAL_LINKS[1].label}</Text>.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="pb-2">
          <BrandFooter variant="stacked" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
