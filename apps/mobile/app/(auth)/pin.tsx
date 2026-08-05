import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  PaperBackground,
  KickerLabel,
  MonoText,
  SerifNumber,
} from '../../src/components/wp';
import { PinKeypad } from '../../src/components/PinKeypad';
import { wp } from '../../src/constants/warehousePaper';
import { verifyPin, clearPin, MAX_PIN_ATTEMPTS, PIN_LENGTH } from '../../src/utils/pin';
import { useAuthStore } from '../../src/stores/authStore';

export default function PinScreen() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const unlockPin = useAuthStore((s) => s.unlockPin);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-entrancy guard. Lives in a ref so toggling it doesn't re-fire the
  // effect (putting `busy` in deps would cause the cleanup to cancel the
  // in-flight verify before it can route the user home).
  const runningRef = useRef(false);

  // Auto-submit when 4 digits are entered.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    (async () => {
      const result = await verifyPin(pin);
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        unlockPin();
        router.replace('/(tabs)');
        return;
      }
      if ('locked' in result && result.locked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await clearAuth(); // also clears tokens
        router.replace('/(auth)/login');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setAttemptsLeft(result.attemptsLeft);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
        setBusy(false);
        runningRef.current = false;
      }, 280);
    })();
  }, [pin, router, clearAuth, unlockPin]);

  const handleForgot = () => {
    Alert.alert(
      'Forgot your PIN?',
      'This will sign you out. Your manager can help you sign back in with your email and password. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await clearPin();
            await clearAuth();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <KickerLabel size={10} tracking={2} color={wp.color.ink}>
            STOCKROOM · KEYPAD
          </KickerLabel>
          <SerifNumber size={38} tracking={-1} leading={1} style={styles.title}>
            Welcome back
          </SerifNumber>
          <MonoText size={11} tracking={1.5} upper color={wp.color.ink3} style={styles.sub}>
            Enter your {PIN_LENGTH}-digit PIN to continue
          </MonoText>
        </View>

        <View style={styles.body}>
          <PinKeypad value={pin} onChange={setPin} shake={shake} disabled={busy} />

          {attemptsLeft != null && attemptsLeft < MAX_PIN_ATTEMPTS && (
            <MonoText
              size={10}
              tracking={1.5}
              upper
              weight={700}
              color={wp.color.red}
              style={styles.attempts}
            >
              {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left
            </MonoText>
          )}
        </View>

        <TouchableOpacity activeOpacity={0.6} onPress={handleForgot} style={styles.forgotWrap}>
          <MonoText
            size={11}
            tracking={1.5}
            upper
            weight={500}
            color={wp.color.ink2}
            style={styles.forgot}
          >
            Forgot PIN?
          </MonoText>
        </TouchableOpacity>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.section,
    paddingBottom: wp.space.block,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  title: { marginTop: 6 },
  sub: { marginTop: 12 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: wp.space.section,
  },
  attempts: {
    marginTop: 18,
  },
  forgotWrap: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  forgot: {
    textDecorationLine: 'underline',
    textDecorationColor: wp.color.ink2,
  },
});
