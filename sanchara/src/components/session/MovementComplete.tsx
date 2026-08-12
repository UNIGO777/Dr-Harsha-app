/**
 * MOVEMENT COMPLETE — the screen that decides whether she opens the app again.
 *
 * She may have finished 10 of 10, or she may have stopped at 6 because her back
 * was worse than she expected this morning. This screen has to read the same
 * either way. So:
 *
 *  - The number is stated, never scored. No percentage, no ring filling
 *    partway, no red, no "incomplete", no streak at risk.
 *  - "6 of 10" sits in the accent colour exactly as "10 of 10" does. The
 *    clinician needs the true figure; the moment the screen makes 6 look like a
 *    failure, the next patient logs 10 and the record is worthless.
 *  - Stopping early is the *responsible* reading of her own body, and the
 *    copy says so.
 *
 * "Keep going" is the accident recovery for a mis-tapped Done. It goes back to
 * the movement with the count intact — which is why ACTIVE doesn't need an
 * "are you sure?" dialog in front of the one interaction that matters most.
 *
 * The rail on the left is the session, vertically: what's done, where she is,
 * what's left. It's the only place the whole workout is visible, and it's here
 * rather than on ACTIVE because ACTIVE has to stay quiet.
 */
import { Check, Undo2 } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { RatingScale } from '@/components/session/RatingScale';
import { withAlpha } from '@/theme/tokens';
import { useThemeColors } from '@/theme/useTheme';

interface RailItem {
  id: string;
  title: string;
}

interface MovementCompleteProps {
  title: string;
  count: number;
  target: number;
  /** Every movement in the session, in order, for the rail. */
  items: RailItem[];
  /** Index of the movement just finished. */
  index: number;
  isLast: boolean;
  /**
   * Ease is asked ONCE per session, on the first movement — being stopped after
   * every single one turned a ten-minute workout into a questionnaire. It is
   * mandatory server-side (it feeds progression), so the first answer carries.
   */
  askEase: boolean;
  ease: number | null;
  onChangeEase: (value: number) => void;
  effort: 'tooHard' | 'tooEasy' | null;
  onChangeEffort: (value: 'tooHard' | 'tooEasy' | null) => void;
  saving: boolean;
  onContinue: () => void;
  onKeepGoing: () => void;
}

export function MovementComplete({
  title,
  count,
  target,
  items,
  index,
  isLast,
  askEase,
  ease,
  onChangeEase,
  effort,
  onChangeEffort,
  saving,
  onContinue,
  onKeepGoing,
}: MovementCompleteProps) {
  const colors = useThemeColors();
  const skipped = count === 0;
  const short = count > 0 && count < target;
  const blocked = askEase && ease === null;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="mt-3 h-14 w-14 items-center justify-center rounded-pill"
          style={{ backgroundColor: withAlpha(colors.accent, 0.14) }}
        >
          <Check color={colors.accent} size={28} strokeWidth={3} />
        </View>

        <Text className="mt-5 font-display-bold text-[30px] leading-[36px] text-primary">
          {title}
        </Text>

        {/* The number, stated. Identical treatment whether it's 6 or 10. */}
        <View className="mt-4 flex-row items-baseline">
          <Text className="font-display-bold" style={{ fontSize: 46, color: colors.accent }}>
            {count}
          </Text>
          <Text
            className="ml-1.5 font-sans text-[17px]"
            style={{ color: colors.textSecondary }}
          >
            of {target} reps recorded
          </Text>
        </View>

        <Text className="mt-2 font-sans text-[14px] leading-6 text-secondary">
          {skipped
            ? 'Skipped for today — that’s noted, and it’s absolutely fine. Some days a movement isn’t the right one.'
            : short
              ? 'Stopping when your body says so is the right call. This is exactly what Dr. Harsha needs to see.'
              : 'All of them. That’s another day of work banked.'}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back and keep going with this movement"
          onPress={onKeepGoing}
          className="mt-4 flex-row items-center self-start active:opacity-70"
          hitSlop={10}
        >
          <Undo2 color={colors.accent} size={15} />
          <Text className="ml-1.5 font-sans-semibold text-[14px]" style={{ color: colors.accent }}>
            Keep going instead
          </Text>
        </Pressable>

        {askEase ? (
          <View className="mt-8">
            <Text className="font-display-bold text-[21px] text-primary">How did that feel?</Text>
            <Text className="mt-1.5 font-sans text-[14px] leading-6 text-secondary">
              We only ask once. Your answer tunes the rest of your programme.
            </Text>

            <View className="mt-5">
              <RatingScale
                value={ease}
                onChange={onChangeEase}
                min={1}
                tone="high-is-good"
                lowLabel="Very hard"
                highLabel="Very easy"
              />
            </View>

            <View className="mt-6 flex-row gap-3">
              {(['tooHard', 'tooEasy'] as const).map((option) => {
                const selected = effort === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onChangeEffort(selected ? null : option)}
                    className="flex-1 items-center rounded-input py-3.5 active:opacity-80"
                    style={{
                      backgroundColor: selected ? withAlpha(colors.accent, 0.12) : colors.inputFill,
                      borderWidth: 1,
                      borderColor: selected ? colors.accent : colors.border,
                    }}
                  >
                    <Text
                      className="font-sans-semibold text-[13px]"
                      style={{ color: selected ? colors.accent : colors.textSecondary }}
                    >
                      {option === 'tooHard' ? 'Too hard' : 'Too easy'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── The rail: the whole session, vertically ───────────────────────── */}
        <Text
          className="mb-3 mt-9 font-sans-semibold text-[11px]"
          style={{ color: colors.microLabel, letterSpacing: 1.6 }}
        >
          TODAY’S SESSION
        </Text>

        {items.map((item, i) => {
          const isDone = i <= index;
          const isCurrent = i === index;
          const last = i === items.length - 1;
          return (
            <View key={item.id} className="flex-row">
              {/* marker + connector */}
              <View className="w-6 items-center">
                <View
                  className="h-6 w-6 items-center justify-center rounded-pill"
                  style={{
                    backgroundColor: isDone ? colors.accent : 'transparent',
                    borderWidth: isDone ? 0 : 1.5,
                    borderColor: colors.border,
                  }}
                >
                  {isDone ? <Check color={colors.accentText} size={13} strokeWidth={3.5} /> : null}
                </View>
                {!last ? (
                  <View
                    className="w-[2px] flex-1"
                    style={{ backgroundColor: i < index ? colors.accent : colors.border }}
                  />
                ) : null}
              </View>

              <Text
                numberOfLines={1}
                className={`ml-3 flex-1 ${isCurrent ? 'font-sans-semibold' : 'font-sans'} text-[15px]`}
                style={{
                  color: isDone ? colors.textPrimary : colors.microLabel,
                  paddingBottom: last ? 0 : 18,
                }}
              >
                {item.title}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="px-6 pb-2 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: blocked || saving }}
          accessibilityLabel={isLast ? 'Finish session' : 'Continue to recovery'}
          disabled={blocked || saving}
          onPress={onContinue}
          className="h-[62px] items-center justify-center rounded-pill active:opacity-90"
          style={{ backgroundColor: colors.accent, opacity: blocked || saving ? 0.45 : 1 }}
        >
          <Text className="font-sans-semibold text-[17px]" style={{ color: colors.accentText }}>
            {saving ? 'Saving…' : isLast ? 'Finish session' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
