import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  MonoText,
  KickerLabel,
  PrimaryBar,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/stores/authStore';

const CODE_LEN = 6;
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function normaliseCode(raw: string): string {
  return Array.from(raw.toUpperCase())
    .filter((ch) => ALPHABET.includes(ch))
    .slice(0, CODE_LEN)
    .join('');
}

export default function AcceptCodeScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const accept = useMutation({
    mutationFn: () => authApi.acceptInviteCode(code, password).then((r) => r.data),
    onSuccess: async (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Backend either returns tokens (auto-sign-in worked) or a legacy
      // success payload. Handle both: if no tokens, fall back to a
      // separate login step with a clear instruction.
      const maybeTokens = data as Partial<{
        access_token: string;
        refresh_token: string;
        user: any;
      }>;
      if (maybeTokens.access_token && maybeTokens.refresh_token && maybeTokens.user) {
        await setAuth(maybeTokens.user, maybeTokens.access_token, maybeTokens.refresh_token);
        // AuthGuard will route to pin-setup automatically since the
        // user has no PIN configured.
        return;
      }
      Alert.alert(
        'Account ready',
        'Your account is set up. Sign in with your email and the password you just chose.',
      );
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const detail =
        err?.response?.data?.detail ?? 'Could not redeem this code. Check it and try again.';
      setError(typeof detail === 'string' ? detail : 'Could not redeem this code.');
    },
  });

  const cleanCode = normaliseCode(code);
  const passwordsMatch = password.length >= 8 && password === confirm;
  const canSubmit = cleanCode.length === CODE_LEN && passwordsMatch && !accept.isPending;

  const handleSubmit = () => {
    setError(null);
    if (cleanCode.length !== CODE_LEN) {
      setError('Code must be 6 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    accept.mutate();
  };

  // Display the typed code as DDD-DDD for readability while the user types.
  const displayCode =
    cleanCode.length > 3 ? `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}` : cleanCode;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Masthead
              kicker={`ONBOARDING — ${fmtKickerDate()}`}
              title="Welcome aboard"
              backUseRouter
            />

            <View style={styles.body}>
              <IntentStrip>
                Enter the 6-character code your manager gave you, then choose
                a password. You'll set up a 4-digit PIN right after, and that's
                what you'll use every day.
              </IntentStrip>

              {/* Code field */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                    Invite code
                  </MonoText>
                  <MonoText size={9} tracking={1.2} upper weight={500} color={wp.color.ink3}>
                    {cleanCode.length}/{CODE_LEN}
                  </MonoText>
                </View>
                <View style={styles.underline}>
                  <TextInput
                    maxFontSizeMultiplier={wp.fontScale.text}
                    value={displayCode}
                    onChangeText={(t) => {
                      setCode(t);
                      setError(null);
                    }}
                    placeholder="ABC-123"
                    placeholderTextColor={wp.color.ink3}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    style={styles.codeInput}
                    maxLength={CODE_LEN + 1}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.field}>
                <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                  New password
                </MonoText>
                <View style={styles.underline}>
                  <TextInput
                    maxFontSizeMultiplier={wp.fontScale.text}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError(null);
                    }}
                    placeholder="At least 8 characters"
                    placeholderTextColor={wp.color.ink3}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Confirm */}
              <View style={styles.field}>
                <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                  Confirm password
                </MonoText>
                <View style={styles.underline}>
                  <TextInput
                    maxFontSizeMultiplier={wp.fontScale.text}
                    value={confirm}
                    onChangeText={(t) => {
                      setConfirm(t);
                      setError(null);
                    }}
                    placeholder="Type it again"
                    placeholderTextColor={wp.color.ink3}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="go"
                  />
                </View>
              </View>

              {error ? (
                <MonoText
                  size={10}
                  tracking={1}
                  upper
                  weight={700}
                  color={wp.color.red}
                  style={styles.error}
                >
                  {error}
                </MonoText>
              ) : null}

              <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={styles.hint}>
                Lost your code? Ask your manager to read it again or send a new one.
              </KickerLabel>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <PrimaryBar
          label="Activate account"
          onPress={handleSubmit}
          loading={accept.isPending}
          disabled={!canSubmit}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 200 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },

  field: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  underline: {
    marginTop: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    paddingBottom: 6,
  },
  codeInput: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 22,
    letterSpacing: 4,
    color: wp.color.ink,
    padding: 0,
    textAlign: 'center',
  },
  input: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 15,
    letterSpacing: 0.5,
    color: wp.color.ink,
    padding: 0,
    minHeight: 22,
  },

  error: {
    marginTop: 14,
    textAlign: 'center',
  },
  hint: {
    marginTop: wp.space.block,
    textAlign: 'center',
    lineHeight: 14,
  },
});
