import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  PaperBackground,
  KickerLabel,
  MonoText,
  SerifNumber,
  IntentStrip,
} from '../../src/components/wp';
import { PinKeypad } from '../../src/components/PinKeypad';
import { wp } from '../../src/constants/warehousePaper';
import { setPin as savePin, verifyPin, PIN_LENGTH } from '../../src/utils/pin';
import { useAuthStore } from '../../src/stores/authStore';

type Phase = 'current' | 'choose' | 'confirm';

export default function PinSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isChange = params.mode === 'change';
  const refreshPinConfigured = useAuthStore((s) => s.refreshPinConfigured);
  const unlockPin = useAuthStore((s) => s.unlockPin);

  const [phase, setPhase] = useState<Phase>(isChange ? 'current' : 'choose');
  const [current, setCurrent] = useState('');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-entrancy guard. See pin.tsx for the rationale — we keep this in a
  // ref so toggling `busy` doesn't re-fire the verify/save effects and
  // cancel the in-flight async work.
  const runningRef = useRef(false);

  // Current-phase (change mode only): verify the existing PIN before
  // letting the user pick a new one.
  useEffect(() => {
    if (phase !== 'current') return;
    if (current.length !== PIN_LENGTH || runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    (async () => {
      const result = await verifyPin(current);
      if (result.ok) {
        Haptics.selectionAsync();
        setError(null);
        setPhase('choose');
        setBusy(false);
        runningRef.current = false;
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if ('locked' in result && result.locked) {
        // Out of attempts — bail, the AuthGuard will route them to login.
        setError('Too many wrong tries. Sign in again.');
        setBusy(false);
        runningRef.current = false;
        router.back();
        return;
      }
      setError(`Wrong PIN — ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'attempt' : 'attempts'} left`);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setCurrent('');
        setBusy(false);
        runningRef.current = false;
      }, 280);
    })();
  }, [current, phase, router]);

  // Choose-phase: when 4 digits entered, move to confirm
  useEffect(() => {
    if (phase !== 'choose') return;
    if (first.length === PIN_LENGTH) {
      // Reject obviously weak choices loudly but don't block — these are
      // a hint, not a hard rule. Repeated/sequential digits are by far
      // the most common bad choices.
      const weak = /^(\d)\1{3}$/.test(first) || first === '1234' || first === '0000';
      if (weak) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setError('Try a less obvious PIN — avoid 1234 / 0000 / 1111');
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setFirst('');
        }, 280);
        return;
      }
      setError(null);
      Haptics.selectionAsync();
      setPhase('confirm');
    }
  }, [first, phase]);

  // Confirm-phase: when 4 digits entered, compare
  useEffect(() => {
    if (phase !== 'confirm') return;
    if (second.length !== PIN_LENGTH || runningRef.current) return;
    if (second !== first) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setError("Those don't match — try again from the start");
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setSecond('');
        setFirst('');
        setPhase('choose');
      }, 320);
      return;
    }
    runningRef.current = true;
    setBusy(true);
    setError(null);
    (async () => {
      try {
        await savePin(first);
        // Update auth store BEFORE navigation so the AuthGuard's next
        // routing pass sees pinConfigured=true and lets the user through
        // instead of bouncing them back to pin-setup.
        await refreshPinConfigured();
        unlockPin();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // After "Change PIN" we go back to where we came from (settings).
        // After initial setup we land in the main app.
        if (isChange) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      } catch {
        setBusy(false);
        runningRef.current = false;
        setError('Could not save PIN. Try again.');
      }
    })();
  }, [second, first, phase, router, isChange, refreshPinConfigured, unlockPin]);

  const value =
    phase === 'current' ? current : phase === 'choose' ? first : second;
  const onChange =
    phase === 'current' ? setCurrent : phase === 'choose' ? setFirst : setSecond;

  const headerKicker =
    phase === 'current'
      ? 'CHANGE PIN · CONFIRM CURRENT'
      : isChange
        ? 'CHANGE PIN · NEW'
        : phase === 'confirm'
          ? 'NEW PIN · CONFIRM'
          : 'WELCOME · CREATE YOUR PIN';

  const headerTitle =
    phase === 'current'
      ? 'Confirm your PIN'
      : phase === 'choose'
        ? isChange
          ? `Choose a new ${PIN_LENGTH}-digit PIN`
          : `Pick any ${PIN_LENGTH} digits`
        : 'Type it again';

  const headerSub =
    phase === 'current'
      ? 'Enter the PIN you currently use to sign in'
      : phase === 'choose'
        ? isChange
          ? 'You will use this every time you open the app'
          : 'Tap any 4 digits — this becomes your new PIN'
        : 'Confirm your new PIN to finish';

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <KickerLabel size={10} tracking={2} color={wp.color.ink}>
            {headerKicker}
          </KickerLabel>
          <SerifNumber size={34} tracking={-1} leading={1} style={styles.title}>
            {headerTitle}
          </SerifNumber>
          <MonoText size={11} tracking={1.5} upper color={wp.color.ink3} style={styles.sub}>
            {headerSub}
          </MonoText>
        </View>

        <View style={styles.body}>
          {!isChange && (
            <View style={styles.intent}>
              <IntentStrip>
                You will use this PIN to sign in from now on. If you forget it,
                your manager can help you reset it.
              </IntentStrip>
            </View>
          )}

          <PinKeypad
            value={value}
            onChange={onChange}
            shake={shake}
            disabled={busy}
          />

          {error && (
            <MonoText
              size={10}
              tracking={1.2}
              upper
              weight={700}
              color={wp.color.red}
              style={styles.error}
            >
              {error}
            </MonoText>
          )}
        </View>
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
    paddingTop: wp.space.block,
    paddingHorizontal: wp.space.screenH,
  },
  intent: {
    alignSelf: 'stretch',
    marginBottom: wp.space.block,
  },
  error: {
    marginTop: 18,
    textAlign: 'center',
  },
});
