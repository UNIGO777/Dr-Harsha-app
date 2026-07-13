// Auth flow: phone entry → OTP. A plain stack; screens are portrait, headerless.
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
