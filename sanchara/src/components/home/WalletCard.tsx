/**
 * WalletCard — prepaid balance as an alternative to a recurring subscription.
 *
 * ⚠️ NO BACKEND YET. The Subscription model currently only supports
 * TRIAL/DAILY/WEEKLY/MONTHLY/QUARTERLY plans — there is no wallet/ledger. This
 * component is built against provisional mock shapes so the UI can be reviewed
 * ahead of that decision. Wire to real endpoints once the wallet model lands.
 *
 * Tone rule: the balance is shown as WHAT IT BUYS ("≈12 days of access"), and a
 * low balance nudges warmly — never a guilt-trip or a hard paywall shove.
 */
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { Pressable, Switch, Text, View } from 'react-native';

import type { HomeWallet } from '@/mocks/home';
import { colors } from '@/theme/tokens';

interface WalletCardProps {
  wallet: HomeWallet;
  onAddMoney: () => void;
  onToggleAutoRecharge: (value: boolean) => void;
}

export function WalletCard({ wallet, onAddMoney, onToggleAutoRecharge }: WalletCardProps) {
  const { balanceInr, estimatedDaysRemaining, lowBalance, autoRecharge, autoRechargeAmount } =
    wallet;

  return (
    <View
      className="rounded-card bg-surface p-5"
      style={{ borderWidth: 1, borderColor: lowBalance ? colors.amber : colors.border }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-display-bold text-primary" style={{ fontSize: 34 }}>
            ₹{balanceInr}
          </Text>
          <Text className="mt-1 font-sans text-[13px]" style={{ color: colors.amber }}>
            ≈ {estimatedDaysRemaining} days of access remaining
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add money to wallet"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onAddMoney();
          }}
          className="flex-row items-center gap-1.5 rounded-pill px-4 py-3 active:opacity-80"
          style={{ borderWidth: 1, borderColor: colors.accent, backgroundColor: 'rgba(79,224,172,0.1)' }}
        >
          <Plus size={15} color={colors.accent} strokeWidth={2.5} />
          <Text className="font-sans-semibold text-[13px]" style={{ color: colors.accent }}>
            Add money
          </Text>
        </Pressable>
      </View>

      {lowBalance ? (
        <Text className="mt-3 font-sans text-[13px]" style={{ color: colors.textSecondary }}>
          Your balance is running low — top up to keep your streak going.
        </Text>
      ) : null}

      <View className="my-4 h-px" style={{ backgroundColor: colors.border }} />

      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="font-sans-medium text-sm text-primary">Auto-recharge</Text>
          <Text className="mt-0.5 font-sans text-xs" style={{ color: colors.microLabel }}>
            Top up ₹{autoRechargeAmount} when balance is low
          </Text>
        </View>
        <Switch
          value={autoRecharge}
          onValueChange={onToggleAutoRecharge}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.textPrimary}
          ios_backgroundColor={colors.border}
          accessibilityLabel="Auto-recharge wallet"
        />
      </View>
    </View>
  );
}
