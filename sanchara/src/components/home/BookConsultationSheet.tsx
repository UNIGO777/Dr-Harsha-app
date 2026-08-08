/**
 * Book a consultation — the sheet behind the specialist card's "Book" button.
 *
 * There is NO consultations module on the server yet, so this cannot actually
 * reserve a slot. Two consequences shaped the design:
 *
 *  1. It doesn't show a calendar. Offering real dates and times that resolve to
 *     nothing would be the most convincing lie the app could tell. Instead the
 *     patient picks a REASON and a rough time of day — information a clinician
 *     would want anyway, and which stays true when the backend arrives.
 *
 *  2. It leads with what genuinely works: calling the clinic. Those buttons
 *     appear only when EXPO_PUBLIC_CLINIC_PHONE is configured, so an unset
 *     number can never render a dead "Call" button.
 *
 * Requesting says plainly that the request has not been sent anywhere.
 */
import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { Info, MessageCircle, Phone, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface BookConsultationSheetProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  title: string;
  avatar: ImageSource | string | number;
}

const REASONS = [
  { id: 'pain_up', label: 'My pain has increased' },
  { id: 'too_hard', label: 'The programme feels too hard' },
  { id: 'too_easy', label: 'I’m ready for more' },
  { id: 'check_in', label: 'General check-in' },
] as const;

const TIMES = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
] as const;

/** Digits-only clinic number, e.g. "+919876543210". Optional. */
const CLINIC_PHONE = process.env.EXPO_PUBLIC_CLINIC_PHONE?.trim();

export function BookConsultationSheet({
  visible,
  onClose,
  name,
  title,
  avatar,
}: BookConsultationSheetProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  function close() {
    setReason(null);
    setTime(null);
    onClose();
  }

  function request() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Booking isn’t live yet',
      CLINIC_PHONE
        ? 'In-app booking is still being built, so this request hasn’t been sent. Please call the clinic to arrange a time.'
        : 'In-app booking is still being built, so this request hasn’t been sent anywhere yet. Your clinician will still see your session records.',
      [{ text: 'OK', onPress: close }],
    );
  }

  function openLink(url: string) {
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open', 'No app on this device can handle that.'),
    );
  }

  const canRequest = reason !== null && time !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        {/* Tapping the scrim closes — expected of a sheet. */}
        <Pressable className="flex-1" accessibilityLabel="Close" onPress={close} />

        <View
          className="rounded-t-[28px] px-6 pb-8 pt-5"
          style={{ backgroundColor: colors.base, maxHeight: '88%' }}
        >
          {/* Grabber + close */}
          <View className="items-center">
            <View
              className="h-1 w-10 rounded-pill"
              style={{ backgroundColor: colors.border }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={10}
            className="absolute right-5 top-5 h-8 w-8 items-center justify-center rounded-pill active:opacity-70"
            style={{ backgroundColor: colors.inputFill }}
          >
            <X color={colors.textSecondary} size={16} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Clinician */}
            <View className="mt-5 items-center">
              <Image
                source={avatar}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  backgroundColor: colors.inputFill,
                }}
                contentFit="cover"
                transition={200}
              />
              <Text className="mt-3 font-display-bold text-2xl text-primary">{name}</Text>
              <Text className="mt-0.5 font-sans text-[13px]" style={{ color: colors.microLabel }}>
                {title}
              </Text>
            </View>

            <Text className="mt-6 font-sans text-[15px] leading-6 text-secondary">
              A consultation is a chance to review how your pain is tracking, adjust your programme,
              and talk through anything that&apos;s worrying you.
            </Text>

            {/* Reason */}
            <Text
              className="mb-2.5 mt-7 font-sans-semibold text-[11px]"
              style={{ color: colors.microLabel, letterSpacing: 1.6 }}
            >
              WHAT WOULD YOU LIKE TO DISCUSS?
            </Text>
            <View className="gap-2">
              {REASONS.map((r) => {
                const selected = reason === r.id;
                return (
                  <Pressable
                    key={r.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setReason(r.id);
                    }}
                    className="flex-row items-center rounded-input px-4 py-3.5 active:opacity-80"
                    style={{
                      backgroundColor: selected ? withAlpha(colors.accent, 0.1) : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                    }}
                  >
                    <View
                      className="h-4 w-4 rounded-pill"
                      style={{
                        borderWidth: 2,
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accent : 'transparent',
                      }}
                    />
                    <Text
                      className="ml-3 font-sans-medium text-[14px]"
                      style={{ color: selected ? colors.textPrimary : colors.textSecondary }}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Preferred time */}
            <Text
              className="mb-2.5 mt-7 font-sans-semibold text-[11px]"
              style={{ color: colors.microLabel, letterSpacing: 1.6 }}
            >
              WHEN SUITS YOU?
            </Text>
            <View className="flex-row gap-2">
              {TIMES.map((t) => {
                const selected = time === t.id;
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setTime(t.id);
                    }}
                    className="flex-1 items-center rounded-input py-3.5 active:opacity-80"
                    style={{
                      backgroundColor: selected ? withAlpha(colors.accent, 0.1) : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                    }}
                  >
                    <Text
                      className="font-sans-medium text-[13px]"
                      style={{ color: selected ? colors.accent : colors.textSecondary }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canRequest }}
              disabled={!canRequest}
              onPress={request}
              className={`mt-7 h-[58px] w-full items-center justify-center rounded-pill ${
                canRequest ? 'active:opacity-90' : 'opacity-40'
              }`}
              style={{ backgroundColor: colors.accent }}
            >
              <Text className="font-sans-semibold text-base" style={{ color: colors.accentText }}>
                Request consultation
              </Text>
            </Pressable>

            {CLINIC_PHONE ? (
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openLink(`tel:${CLINIC_PHONE}`)}
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-pill active:opacity-80"
                  style={{ backgroundColor: colors.inputFill, borderWidth: 1, borderColor: colors.border }}
                >
                  <Phone color={colors.textPrimary} size={17} />
                  <Text className="font-sans-semibold text-[14px] text-primary">Call</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openLink(`https://wa.me/${CLINIC_PHONE.replace(/[^\d]/g, '')}`)}
                  className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-pill active:opacity-80"
                  style={{ backgroundColor: colors.inputFill, borderWidth: 1, borderColor: colors.border }}
                >
                  <MessageCircle color={colors.textPrimary} size={17} />
                  <Text className="font-sans-semibold text-[14px] text-primary">WhatsApp</Text>
                </Pressable>
              </View>
            ) : null}

            <View
              className="mt-5 flex-row items-start rounded-card p-3.5"
              style={{ backgroundColor: colors.inputFill }}
            >
              <Info color={colors.microLabel} size={14} />
              <Text
                className="ml-2 flex-1 font-sans text-[11px] leading-[17px]"
                style={{ color: colors.microLabel }}
              >
                In-app booking is still being built. Your clinician can already see your sessions and
                pain check-ins.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
