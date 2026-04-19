import { Stack } from 'expo-router';
import { wp } from '../../src/constants/warehousePaper';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: wp.color.paper },
      }}
    />
  );
}
