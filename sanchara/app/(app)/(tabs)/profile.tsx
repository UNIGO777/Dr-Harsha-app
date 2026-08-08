/**
 * Profile — who the patient is, where they are in treatment, and the few things
 * they're allowed to change.
 *
 * Deliberately read-first: everything clinical (level, group, entitlement, trial
 * dates) is shown but NOT editable, because those are assigned by onboarding or
 * a clinician. The editable half — personal details and health context — lives
 * behind the two Edit links, since pain areas in particular feed the session
 * safety check-in and shouldn't be changed by a stray tap.
 */
import { useRouter } from 'expo-router';
import { LogOut, ShieldCheck, User as UserIcon } from 'lucide-react-native';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Row, Section } from '@/components/profile/Rows';
import { Button, ScreenHeader, ThemePicker } from '@/components/ui';
import { useMe } from '@/features/auth/api';
import { useMyEnrollment } from '@/features/enrollments/api';
import { useSessionHistory } from '@/features/sessions/api';
import { formatPhoneForDisplay } from '@/lib/formatters';
import { useAuthStore } from '@/store/authStore';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const ACTIVITY_LABEL: Record<string, string> = {
  none: 'Not active yet',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** "12 Mar 2026" — plain and unambiguous for a 30–60 audience. */
function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Whole days from now until `iso`, floored at 0. */
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

function StatTile({ value, label }: { value: string; label: string }) {
  const colors = useThemeColors();
  return (
    <View
      className="flex-1 items-center rounded-card px-2 py-4"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <Text className="font-display-bold text-2xl text-primary">{value}</Text>
      <Text
        numberOfLines={1}
        className="mt-1 font-sans text-[11px]"
        style={{ color: colors.microLabel }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  const me = useMe();
  const enrollment = useMyEnrollment();
  const history = useSessionHistory();

  async function onLogout() {
    await signOut();
    router.replace('/');
  }

  if (me.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <ScreenHeader title="Profile" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const user = me.data;
  const plan = enrollment.data;
  const trialDays = daysUntil(user?.trialEndDate);

  // Membership line: entitlement is what actually gates access, so lead with it.
  const membership = !user?.entitled
    ? { label: 'No active access', tone: colors.danger }
    : trialDays !== null
      ? { label: `Trial · ${trialDays} day${trialDays === 1 ? '' : 's'} left`, tone: colors.amber }
      : { label: 'Active', tone: colors.accent };

  const initial = (user?.name?.trim()?.charAt(0) ?? '?').toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScreenHeader title="Profile" />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View className="mt-6 flex-row items-center">
          <View
            className="h-16 w-16 items-center justify-center rounded-pill"
            style={{ backgroundColor: withAlpha(colors.accent, 0.14) }}
          >
            {user?.name ? (
              <Text className="font-display-bold text-2xl" style={{ color: colors.accent }}>
                {initial}
              </Text>
            ) : (
              <UserIcon color={colors.accent} size={26} />
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text className="font-display-bold text-2xl text-primary" numberOfLines={1}>
              {user?.name ?? 'Your account'}
            </Text>
            <Text className="mt-0.5 font-sans text-sm" style={{ color: colors.microLabel }}>
              {user?.phone ? formatPhoneForDisplay(user.phone) : ''}
            </Text>
          </View>
        </View>

        {/* Membership */}
        <View
          className="mt-5 flex-row items-center rounded-card px-4 py-3.5"
          style={{ backgroundColor: withAlpha(membership.tone, 0.1) }}
        >
          <ShieldCheck color={membership.tone} size={18} />
          <Text
            className="ml-2.5 flex-1 font-sans-semibold text-[13px]"
            style={{ color: membership.tone }}
          >
            {membership.label}
          </Text>
          {user?.trialEndDate ? (
            <Text className="font-sans text-[11px]" style={{ color: colors.microLabel }}>
              until {formatDate(user.trialEndDate)}
            </Text>
          ) : null}
        </View>

        {/* At-a-glance numbers */}
        <View className="mt-4 flex-row gap-3">
          <StatTile value={`${user?.weeklyActivity.currentMinutes ?? 0}`} label="min this week" />
          <StatTile value={`${history.data?.pagination.total ?? 0}`} label="sessions done" />
          <StatTile value={user?.bmi ? user.bmi.toFixed(1) : '—'} label="BMI" />
        </View>

        {/* Current plan */}
        {plan ? (
          <Section title="Your plan">
            <Row label="Program" value={plan.program?.name} />
            <Row
              label="Position"
              value={
                plan.totalLevels > 0
                  ? `Level ${plan.currentLevel} · Day ${plan.currentDay}`
                  : `Day ${plan.currentDay}`
              }
            />
            <Row label="Progress" value={`${plan.percentComplete}% complete`} />
            <Row label="Started" value={formatDate(plan.startedAt)} last />
          </Section>
        ) : null}

        {/* Editable: personal */}
        <Section title="About you" action="Edit" onAction={() => router.push('/(profile)/about')}>
          <Row label="Name" value={user?.name} />
          <Row label="Age" value={user?.age} />
          <Row label="Gender" value={user?.gender ? GENDER_LABEL[user.gender] : undefined} />
          <Row label="Height" value={user?.heightCm ? `${user.heightCm} cm` : undefined} />
          <Row label="Weight" value={user?.weightKg ? `${user.weightKg} kg` : undefined} />
          <Row label="Email" value={user?.email} last />
        </Section>

        {/* Editable: clinical context */}
        <Section title="Health" action="Edit" onAction={() => router.push('/(profile)/health')}>
          <Row label="Pain areas" value={user?.painAreas?.join(', ')} />
          <Row label="Conditions" value={user?.conditions?.join(', ')} />
          <Row
            label="Activity level"
            value={user?.exerciseHistory ? ACTIVITY_LABEL[user.exerciseHistory] : undefined}
          />
          <Row label="Goal" value={user?.goal} />
          <Row label="Past surgery" value={user?.surgeryHistory} last />
        </Section>

        {/* Appearance */}
        <View className="mt-8">
          <Text
            className="mb-3 font-sans-semibold text-[11px]"
            style={{ color: colors.microLabel, letterSpacing: 1.6 }}
          >
            APPEARANCE
          </Text>
          <ThemePicker />
        </View>

        {/* Account */}
        <Section title="Account">
          <Row label="Member since" value={formatDate(user?.memberSince)} />
          <Row label="Phone" value={user?.phone ? formatPhoneForDisplay(user.phone) : undefined} last />
        </Section>

        <View className="mt-8">
          <Button
            label="Log out"
            variant="secondary"
            onPress={() =>
              Alert.alert('Log out?', "You'll need your phone number to sign back in.", [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: onLogout },
              ])
            }
          />
          <View className="mt-3 flex-row items-center justify-center">
            <LogOut color={colors.microLabel} size={12} />
            <Text className="ml-1.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
              Your progress stays saved
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
