/**
 * Thin wrapper over expo-secure-store for the JWT tokens.
 *
 * Tokens live in the device keychain/keystore — NEVER in AsyncStorage, which is
 * unencrypted. All access to the tokens goes through these helpers so there is a
 * single place to change key names or add refresh-token handling later.
 */
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'sanchara.accessToken';
const REFRESH_TOKEN_KEY = 'sanchara.refreshToken';
// Short-lived token issued on OTP verify for not-yet-onboarded users; it
// authorizes the onboarding submission, after which real auth tokens are issued.
const ONBOARDING_TOKEN_KEY = 'sanchara.onboardingToken';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getOnboardingToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ONBOARDING_TOKEN_KEY);
}

export async function setOnboardingToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_TOKEN_KEY, token);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ONBOARDING_TOKEN_KEY);
}
