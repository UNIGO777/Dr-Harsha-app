/**
 * ErrorState — what a screen shows when its data fails to load.
 *
 * Exists because the alternative is worse than an error message: a screen that
 * only handles "loading" either spins forever or renders its EMPTY state, which
 * tells the patient "you have no sessions" when the truth is "we couldn't
 * reach the server". Both are dead ends with no way forward.
 *
 * An expired session is separated out because the recovery differs — retrying
 * will never work, the user has to sign in again.
 */
import { CloudOff, LockKeyhole } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/theme/useTheme';

/** Pulls the HTTP status off an axios-shaped error. */
export function errorStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

export function isAuthError(error: unknown): boolean {
  const s = errorStatus(error);
  return s === 401 || s === 403;
}

interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  /** Shown instead of the generic line, e.g. "We couldn't load this programme". */
  title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const colors = useThemeColors();
  const auth = isAuthError(error);
  const Icon = auth ? LockKeyhole : CloudOff;

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="h-14 w-14 items-center justify-center rounded-pill"
        style={{ backgroundColor: colors.inputFill }}
      >
        <Icon color={colors.microLabel} size={24} />
      </View>

      <Text className="mt-5 text-center font-display-bold text-xl text-primary">
        {auth ? 'Your session has ended' : (title ?? "We couldn't load this")}
      </Text>
      <Text className="mt-2 text-center font-sans text-sm leading-6 text-secondary">
        {auth
          ? 'Please sign in again to continue.'
          : 'Check your connection and try again.'}
      </Text>

      {onRetry && !auth ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-6 rounded-pill bg-accent px-6 py-3.5 active:opacity-90"
        >
          <Text className="font-sans-semibold text-sm" style={{ color: colors.accentText }}>
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
