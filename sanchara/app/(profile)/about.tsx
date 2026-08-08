/**
 * Edit personal details.
 *
 * Age is editable but consequential: the backend assigns GROUP_1/GROUP_2 from
 * age at onboarding, and that is NOT recomputed here — changing age after the
 * fact would otherwise silently re-tier a patient's programme. The copy says as
 * much rather than pretending the field is inert.
 *
 * Height and weight recompute BMI server-side (a User pre-save hook), and the
 * new weight is appended to the weight log the clinician reads.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { EditScaffold } from '@/components/profile/EditScaffold';
import { Input } from '@/components/ui';
import { useMe, useUpdateMe, type UpdateMyProfileInput } from '@/features/auth/api';
import { GENDERS, type Gender } from '@/lib/enums';
import { useThemeColors } from '@/theme/useTheme';

const GENDER_LABEL: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

/** '' → undefined, so an emptied field is omitted rather than sent as blank. */
function num(text: string): number | undefined {
  const n = Number(text.trim());
  return text.trim() && Number.isFinite(n) ? n : undefined;
}

export default function EditAboutScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const me = useMe();
  const update = useUpdateMe();

  const user = me.data;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState<Gender | undefined>(user?.gender);
  const [heightCm, setHeightCm] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [weightKg, setWeightKg] = useState(user?.weightKg ? String(user.weightKg) : '');

  const dirty =
    name !== (user?.name ?? '') ||
    email !== (user?.email ?? '') ||
    age !== (user?.age ? String(user.age) : '') ||
    gender !== user?.gender ||
    heightCm !== (user?.heightCm ? String(user.heightCm) : '') ||
    weightKg !== (user?.weightKg ? String(user.weightKg) : '');

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    // Send only what changed — PATCH treats an omitted key as "leave alone".
    const patch: UpdateMyProfileInput = {};
    if (trimmedName !== (user?.name ?? '')) patch.name = trimmedName;
    if (email.trim() !== (user?.email ?? '')) patch.email = email.trim() || undefined;
    if (num(age) !== user?.age) patch.age = num(age);
    if (gender !== user?.gender) patch.gender = gender;
    if (num(heightCm) !== user?.heightCm) patch.heightCm = num(heightCm);
    if (num(weightKg) !== user?.weightKg) patch.weightKg = num(weightKg);

    try {
      await update.mutateAsync(patch);
      router.back();
    } catch {
      Alert.alert('Could not save', 'Please check your details and try again.');
    }
  }

  return (
    <EditScaffold
      title="About you"
      subtitle="Keeping this current helps your clinical team tailor your programme."
      dirty={dirty}
      saving={update.isPending}
      onSave={save}
    >
      <View className="gap-5">
        <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View>
          <Text className="mb-2 font-sans text-xs uppercase tracking-[2px] text-micro">Gender</Text>
          <View className="flex-row gap-2">
            {GENDERS.map((g) => {
              const selected = gender === g;
              return (
                <Pressable
                  key={g}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setGender(g)}
                  className="flex-1 items-center rounded-input py-3.5 active:opacity-80"
                  style={{
                    backgroundColor: colors.inputFill,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                  }}
                >
                  <Text
                    className="font-sans-medium text-[14px]"
                    style={{ color: selected ? colors.accent : colors.textSecondary }}
                  >
                    {GENDER_LABEL[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="Height (cm)"
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="170"
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Weight (kg)"
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="70"
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text className="-mt-2 font-sans text-[11px]" style={{ color: colors.microLabel }}>
          Your BMI updates automatically from these.
        </Text>

        <View>
          <Input
            label="Age"
            value={age}
            onChangeText={setAge}
            placeholder="45"
            keyboardType="number-pad"
          />
          <Text className="mt-1.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
            Your programme tier was set from your age at sign-up and won&apos;t change here. Speak to
            your clinician if this needs revisiting.
          </Text>
        </View>
      </View>
    </EditScaffold>
  );
}
