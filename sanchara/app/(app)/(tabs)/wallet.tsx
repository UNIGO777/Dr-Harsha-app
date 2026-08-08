/**
 * Wallet — prepaid balance instead of a monthly subscription.
 *
 * The whole flow is here and reviewable, but NO money moves: there is no wallet
 * module on the server and no payment provider wired up. Rather than fake a
 * credit (which would leave a made-up balance sitting in the UI looking real),
 * the top-up step ends in an explicit "not live yet" notice. Everything that
 * costs nothing to be truthful about — balance, runway, auto-recharge — is
 * fully interactive against the shared wallet store.
 *
 * See src/store/walletStore.ts for what to replace when the backend lands.
 */
import * as Haptics from 'expo-haptics';
import { Info, Plus, TriangleAlert, Wallet as WalletIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui';
import {
  DAILY_RATE_INR,
  LOW_BALANCE_INR,
  daysRemaining,
  useWalletStore,
} from '@/store/walletStore';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

const TOP_UP_AMOUNTS = [200, 500, 1000, 2000];
const AUTO_RECHARGE_AMOUNTS = [200, 500, 1000];

export default function WalletScreen() {
  const colors = useThemeColors();

  const balanceInr = useWalletStore((s) => s.balanceInr);
  const autoRecharge = useWalletStore((s) => s.autoRecharge);
  const autoRechargeAmount = useWalletStore((s) => s.autoRechargeAmount);
  const transactions = useWalletStore((s) => s.transactions);
  const setAutoRecharge = useWalletStore((s) => s.setAutoRecharge);
  const setAutoRechargeAmount = useWalletStore((s) => s.setAutoRechargeAmount);

  const [selected, setSelected] = useState<number | null>(null);

  const days = daysRemaining(balanceInr);
  const low = balanceInr <= LOW_BALANCE_INR;

  function topUp() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Payments not live yet',
      `Adding ₹${selected} isn't connected to a payment provider yet, so nothing has been charged and your balance is unchanged. This screen is here so the flow can be reviewed first.`,
      [{ text: 'OK' }],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScreenHeader title="Wallet" />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance — shown as what it BUYS, not just a number. */}
        <View
          className="mt-5 rounded-card p-6"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: low ? colors.amber : withAlpha(colors.accent, 0.35),
          }}
        >
          <View className="flex-row items-center">
            <View
              className="h-10 w-10 items-center justify-center rounded-pill"
              style={{ backgroundColor: withAlpha(low ? colors.amber : colors.accent, 0.14) }}
            >
              <WalletIcon color={low ? colors.amber : colors.accent} size={20} />
            </View>
            <Text
              className="ml-3 font-sans-semibold text-[11px]"
              style={{ color: colors.microLabel, letterSpacing: 1.6 }}
            >
              BALANCE
            </Text>
          </View>

          <Text className="mt-4 font-display-bold text-5xl text-primary">₹{balanceInr}</Text>
          <Text className="mt-1.5 font-sans text-[15px] leading-6 text-secondary">
            {days > 0
              ? `About ${days} more day${days === 1 ? '' : 's'} of access at ₹${DAILY_RATE_INR} a day.`
              : 'Top up to keep your programme running.'}
          </Text>

          {low ? (
            <View
              className="mt-4 flex-row items-start rounded-input p-3"
              style={{ backgroundColor: withAlpha(colors.amber, 0.12) }}
            >
              <TriangleAlert color={colors.amber} size={16} />
              <Text
                className="ml-2 flex-1 font-sans text-[12px] leading-[18px]"
                style={{ color: colors.amber }}
              >
                Running low. Top up soon so your sessions aren&apos;t interrupted.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Top up */}
        <Text
          className="mb-3 mt-8 font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          ADD MONEY
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {TOP_UP_AMOUNTS.map((amount) => {
            const active = selected === amount;
            return (
              <Pressable
                key={amount}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelected(active ? null : amount);
                }}
                className="min-w-[22%] flex-1 items-center rounded-input py-4 active:opacity-80"
                style={{
                  backgroundColor: active ? withAlpha(colors.accent, 0.12) : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                }}
              >
                <Text
                  className="font-sans-semibold text-[15px]"
                  style={{ color: active ? colors.accent : colors.textPrimary }}
                >
                  ₹{amount}
                </Text>
                <Text className="mt-0.5 font-sans text-[10px]" style={{ color: colors.microLabel }}>
                  {daysRemaining(amount)} days
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: selected === null }}
          disabled={selected === null}
          onPress={topUp}
          className={`mt-4 h-[58px] w-full flex-row items-center justify-center gap-2 rounded-pill ${
            selected === null ? 'opacity-40' : 'active:opacity-90'
          }`}
          style={{ backgroundColor: colors.accent }}
        >
          <Plus color={colors.accentText} size={19} strokeWidth={2.6} />
          <Text className="font-sans-semibold text-base" style={{ color: colors.accentText }}>
            {selected === null ? 'Choose an amount' : `Add ₹${selected}`}
          </Text>
        </Pressable>

        {/* Auto-recharge */}
        <Text
          className="mb-3 mt-8 font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          AUTO-RECHARGE
        </Text>
        <View className="rounded-card border border-border bg-surface">
          <View className="flex-row items-center px-4 py-4">
            <View className="flex-1 pr-4">
              <Text className="font-sans-medium text-[15px] text-primary">
                Top up automatically
              </Text>
              <Text className="mt-0.5 font-sans text-[12px]" style={{ color: colors.microLabel }}>
                When your balance drops below ₹{LOW_BALANCE_INR}
              </Text>
            </View>
            <Switch
              value={autoRecharge}
              onValueChange={setAutoRecharge}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
              accessibilityLabel="Auto-recharge"
            />
          </View>

          {autoRecharge ? (
            <View
              className="px-4 pb-4"
              style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}
            >
              <Text className="mb-2.5 font-sans text-[12px]" style={{ color: colors.microLabel }}>
                Recharge amount
              </Text>
              <View className="flex-row gap-2">
                {AUTO_RECHARGE_AMOUNTS.map((amount) => {
                  const active = autoRechargeAmount === amount;
                  return (
                    <Pressable
                      key={amount}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => setAutoRechargeAmount(amount)}
                      className="flex-1 items-center rounded-input py-3 active:opacity-80"
                      style={{
                        backgroundColor: colors.inputFill,
                        borderWidth: 1,
                        borderColor: active ? colors.accent : colors.border,
                      }}
                    >
                      <Text
                        className="font-sans-medium text-[13px]"
                        style={{ color: active ? colors.accent : colors.textSecondary }}
                      >
                        ₹{amount}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* Ledger */}
        <Text
          className="mb-3 mt-8 font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          TRANSACTIONS
        </Text>
        {transactions.length === 0 ? (
          <View className="rounded-card border border-border bg-surface p-5">
            <Text className="font-sans text-[13px] leading-5" style={{ color: colors.microLabel }}>
              No transactions yet. Top-ups and daily charges will be listed here.
            </Text>
          </View>
        ) : (
          <View className="overflow-hidden rounded-card border border-border bg-surface">
            {transactions.map((t, i, arr) => (
              <View
                key={t.id}
                className="flex-row items-center px-4 py-3.5"
                style={
                  i === arr.length - 1
                    ? undefined
                    : { borderBottomWidth: 1, borderBottomColor: colors.border }
                }
              >
                <View className="flex-1">
                  <Text className="font-sans-medium text-[14px] text-primary">{t.label}</Text>
                  <Text className="mt-0.5 font-sans text-[11px]" style={{ color: colors.microLabel }}>
                    {new Date(t.at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text
                  className="font-sans-semibold text-[14px]"
                  style={{ color: t.kind === 'credit' ? colors.accent : colors.textSecondary }}
                >
                  {t.kind === 'credit' ? '+' : '−'}₹{t.amountInr}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Honest about what isn't built */}
        <View
          className="mt-6 flex-row items-start rounded-card p-4"
          style={{ backgroundColor: colors.inputFill }}
        >
          <Info color={colors.microLabel} size={15} />
          <Text
            className="ml-2.5 flex-1 font-sans text-[12px] leading-[18px]"
            style={{ color: colors.microLabel }}
          >
            Payments aren&apos;t connected yet, so the balance shown is a placeholder and nothing is
            charged. Your programme is unaffected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
