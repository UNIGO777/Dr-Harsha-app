// OTP entry — verifies the code and routes to onboarding (new user) or the app.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandFooter } from '@/components/BrandFooter';
import { Button, OtpInput } from '@/components/ui';
import { useRequestOtp, useVerifyOtp } from '@/features/auth/api';
import { formatCountdown, formatPhoneForDisplay } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/tokens';

const RESEND_SECONDS = 45;

function extractApiError(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();
  const signIn = useAuthStore((s) => s.signIn);
  const startOnboarding = useAuthStore((s) => s.startOnboarding);

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // Resend countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const onVerify = useCallback(async () => {
    if (otp.length !== 6 || !phone) return;
    setError(null);
    try {
      const res = await verifyOtp.mutateAsync({ phone, otp });
      if (res.isNewUser) {
        await startOnboarding(res.onboardingToken, phone);
        router.replace('/(onboarding)/welcome');
      } else {
        await signIn({ accessToken: res.accessToken, refreshToken: res.refreshToken }, phone);
        router.replace('/(app)/(tabs)/home');
      }
    } catch (e: unknown) {
      setError(extractApiError(e, 'That code didn’t work. Please try again.'));
    }
  }, [otp, phone, verifyOtp, startOnboarding, signIn, router]);

  async function onResend() {
    if (secondsLeft > 0 || !phone) return;
    setError(null);
    setOtp('');
    try {
      await requestOtp.mutateAsync(phone);
      setSecondsLeft(RESEND_SECONDS);
    } catch (e: unknown) {
      setError(extractApiError(e, 'Could not resend the code.'));
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

        {/* Content */}
        <View className="mt-auto">
          <Text className="font-display-semibold text-3xl text-primary">Enter the code</Text>
          <View className="mt-2 flex-row items-center">
            <Text className="font-sans text-base text-secondary">
              Sent to {phone ? formatPhoneForDisplay(phone) : 'your number'}{' '}
            </Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text className="font-sans-semibold text-base text-accent">Edit</Text>
            </Pressable>
          </View>

          <View className="mt-8">
            <OtpInput value={otp} onChange={setOtp} length={6} />
          </View>

          {error ? (
            <Text className="mt-4 text-center font-sans text-sm text-danger">{error}</Text>
          ) : null}

          {/* Resend */}
          <View className="mt-6 flex-row items-center justify-center">
            {secondsLeft > 0 ? (
              <Text className="font-sans text-xs uppercase tracking-[2px] text-micro">
                Resend in{' '}
                <Text className="font-sans-semibold text-accent">
                  {formatCountdown(secondsLeft)}
                </Text>
              </Text>
            ) : (
              <Pressable onPress={onResend} hitSlop={8} disabled={requestOtp.isPending}>
                <Text className="font-sans-semibold text-xs uppercase tracking-[2px] text-accent">
                  {requestOtp.isPending ? 'Sending…' : 'Resend code'}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="mt-6">
            <Button
              label="Verify"
              loading={verifyOtp.isPending}
              disabled={otp.length !== 6}
              onPress={onVerify}
            />
          </View>
        </View>

        {/* Footer */}
        <View className="mt-auto pb-2">
          <BrandFooter variant="inline" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
