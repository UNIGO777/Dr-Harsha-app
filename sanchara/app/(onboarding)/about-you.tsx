// Onboarding step 3 — age + gender. Age outside 30–60 surfaces the waitlist
// modal (the backend also enforces this on final submit).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold';
import { Button, Input } from '@/components/ui';
import { STEP } from '@/features/onboarding/steps';
import { ELIGIBLE_MAX_AGE, ELIGIBLE_MIN_AGE, GENDERS, type Gender } from '@/lib/enums';
import { titleCase } from '@/lib/formatters';
import { useOnboardingStore } from '@/store/onboardingStore';

export default function AboutYouScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  const [age, setAge] = useState(draft.age ? String(draft.age) : '');
  const [gender, setGender] = useState<Gender | undefined>(draft.gender);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const ageNum = Number(age);
  const ageOk = Number.isInteger(ageNum) && ageNum >= 1 && ageNum <= 120;
  const canContinue = ageOk && !!gender;

  function proceed() {
    update({ age: ageNum, gender });
    router.push('/(onboarding)/body-metrics');
  }

  function onContinue() {
    if (!canContinue) return;
    update({ age: ageNum, gender });
    if (ageNum < ELIGIBLE_MIN_AGE || ageNum > ELIGIBLE_MAX_AGE) {
      setShowWaitlist(true);
      return;
    }
    proceed();
  }

  return (
    <OnboardingScaffold
      step={STEP.aboutYou}
      title="About you"
      subtitle="This helps your clinical team build a plan that's right for your body."
      ctaDisabled={!canContinue}
      onContinue={onContinue}
    >
      <Input
        label="Age"
        placeholder="Enter your age"
        keyboardType="number-pad"
        value={age}
        maxLength={3}
        onChangeText={(t) => setAge(t.replace(/\D/g, ''))}
      />

      <View className="mt-6">
        <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">Gender</Text>
        <View className="flex-row rounded-input border border-border bg-input-fill p-1">
          {GENDERS.map((g) => {
            const selected = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGender(g)}
                className={`flex-1 items-center rounded-[12px] py-3 ${selected ? 'bg-accent' : ''}`}
              >
                <Text
                  className={`font-sans-medium text-sm ${
                    selected ? 'text-accent-text' : 'text-secondary'
                  }`}
                >
                  {titleCase(g)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Waitlist modal */}
      <Modal visible={showWaitlist} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 px-8">
          <View className="w-full rounded-card border border-border bg-surface p-6">
            <Text className="font-display-semibold text-2xl text-primary">
              You&apos;re a little outside our range
            </Text>
            <Text className="mt-3 font-sans text-base leading-6 text-secondary">
              This medically-supervised programme currently serves ages {ELIGIBLE_MIN_AGE}–
              {ELIGIBLE_MAX_AGE}. We&apos;ll add you to the waitlist and let you know the moment we
              expand.
            </Text>
            <View className="mt-6 gap-3">
              <Button label="Join the waitlist" onPress={proceed} />
              <Button label="Edit my age" variant="secondary" onPress={() => setShowWaitlist(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </OnboardingScaffold>
  );
}
