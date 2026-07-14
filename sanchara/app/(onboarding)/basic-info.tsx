// Onboarding step 2 — name (required) + email (optional).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Input } from '@/components/ui';
import { STEP } from '@/features/onboarding/steps';
import { useOnboardingStore } from '@/store/onboardingStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BasicInfoScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [name, setName] = useState(draft.name ?? '');
  const [email, setEmail] = useState(draft.email ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const nameOk = name.trim().length > 0;

  function onContinue() {
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email');
      return;
    }
    update({ name: name.trim(), email: email.trim() || undefined });
    router.push('/(onboarding)/about-you');
  }

  return (
    <OnboardingScaffold
      step={STEP.basicInfo}
      title="Tell us who you are"
      subtitle="We personalize your programme based on your profile and preferences."
      ctaDisabled={!nameOk}
      onContinue={onContinue}
      footerNote="🛡  Secure and encrypted"
    >
      <View className="gap-5">
        <Input
          label="Name"
          placeholder="Your full name"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />
        <Input
          label="Email (optional)"
          placeholder="hello@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          error={emailError ?? undefined}
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError(null);
          }}
        />
      </View>
    </OnboardingScaffold>
  );
}
