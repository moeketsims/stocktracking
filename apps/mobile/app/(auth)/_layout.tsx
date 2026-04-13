import { Stack } from 'expo-router';
import { brand, colors } from '../../src/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: brand.gradientStart },
      }}
    />
  );
}
