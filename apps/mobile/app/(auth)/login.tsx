import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  PaperBackground,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';
import { APP_VERSION } from '../../src/constants/config';
import { useLogin } from '../../src/hooks/useAuth';
import { isDevAutoAuthEnabled } from '../../src/utils/devAutoAuth';
import { clearPin } from '../../src/utils/pin';

function getLoginErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
  ) {
    return (error as { response: { data: { detail: string } } }).response.data.detail;
  }
  return 'Login failed. Please check your credentials.';
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const showTestLogin = isDevAutoAuthEnabled();

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;
  const loginError = getLoginErrorMessage(login.error);

  const handleLogin = () => {
    if (!canSubmit) return;
    login.reset();
    login.mutate({ email: email.trim(), password });
  };

  const handleTestLogin = () => {
    login.reset();
    login.mutate({ email: 'test@admin.com', password: 'password123' });
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Reset device PIN?',
      'This clears the PIN saved on this phone. Sign in afterward to create a new PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          style: 'destructive',
          onPress: async () => {
            await clearPin();
            Alert.alert('PIN reset', 'Sign in now to create a new four-digit PIN.');
          },
        },
      ],
    );
  };

  const year = new Date().getFullYear();

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Stamp flourish */}
            <View style={styles.stampWrap} pointerEvents="none">
              <Stamp colorHex={wp.color.red} rotate={-5} size={9}>
                Authorized Personnel
              </Stamp>
            </View>

            {/* Masthead */}
            <View style={styles.masthead}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                {`POTATO STOCK · EST. ${year}`}
              </KickerLabel>
              <SerifNumber
                size={64}
                tracking={-2}
                leading={0.92}
                style={styles.title}
              >
                The Stockroom
              </SerifNumber>
              <MonoText
                size={11}
                tracking={1.5}
                upper
                weight={500}
                color={wp.color.ink3}
                style={styles.subKicker}
              >
                Sign in to continue
              </MonoText>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
                rightLabel={showPassword ? 'HIDE' : 'SHOW'}
                onRightPress={() => setShowPassword((v) => !v)}
              />
            </View>

            {/* Sign in button — inline, PrimaryBar aesthetic */}
            <View style={styles.buttonWrap}>
              <View pointerEvents="none" style={styles.buttonShadow} />
              <TouchableOpacity
                onPress={handleLogin}
                disabled={!canSubmit || login.isPending}
                activeOpacity={0.85}
                style={[
                  styles.button,
                  (!canSubmit || login.isPending) && styles.buttonDisabled,
                ]}
              >
                {login.isPending ? (
                  <ActivityIndicator color={wp.color.paper} size="small" />
                ) : (
                  <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.buttonLabel}>
                    Sign in
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {loginError ? (
              <View style={styles.errorBox}>
                <MonoText size={11} tracking={1.1} upper weight={700} color={wp.color.red}>
                  {loginError}
                </MonoText>
              </View>
            ) : null}

            {showTestLogin ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleTestLogin}
                disabled={login.isPending}
                style={styles.testButton}
              >
                <MonoText size={11} tracking={1.5} upper weight={700} color={wp.color.ink}>
                  Use Heroku Test Admin
                </MonoText>
              </TouchableOpacity>
            ) : null}

            {/* Recovery + onboarding alternatives */}
            <View style={styles.altLinks}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => router.push('/(auth)/accept-code')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MonoText
                  size={11}
                  tracking={1.5}
                  upper
                  weight={700}
                  color={wp.color.ink}
                  style={styles.altLink}
                >
                  Have an invite code?
                </MonoText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={handleForgotPin}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MonoText
                  size={11}
                  tracking={1.5}
                  upper
                  weight={500}
                  color={wp.color.ink2}
                  style={styles.altLinkSub}
                >
                  Forgot PIN?
                </MonoText>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <MonoText size={9} tracking={1.2} upper color={wp.color.ink3}>
                {`v${APP_VERSION}`}
              </MonoText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperBackground>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password';
  textContentType?: 'emailAddress' | 'password';
  secureTextEntry?: boolean;
  returnKeyType?: 'go' | 'next' | 'done';
  onSubmitEditing?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  rightLabel,
  onRightPress,
  ...rest
}: FieldProps) {
  const empty = value.length === 0;
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
          {label}
        </MonoText>
        {rightLabel ? (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MonoText size={10} tracking={1.2} upper weight={700} color={wp.color.ink2}>
              {rightLabel}
            </MonoText>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.underline}>
        <TextInput
          maxFontSizeMultiplier={wp.fontScale.text}
          {...rest}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="transparent"
          style={styles.input}
        />
        {/* The cap below must match the TextInput's above — this Text is drawn
            *over* the field, so a different multiplier desyncs the two. */}
        {empty && placeholder ? (
          <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.placeholder} pointerEvents="none">
            {placeholder}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: wp.space.screenH,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  stampWrap: {
    position: 'absolute',
    top: 18,
    right: 22,
  },

  masthead: {
    marginTop: 12,
    marginBottom: wp.space.section,
  },
  title: {
    marginTop: 10,
  },
  subKicker: {
    marginTop: 14,
  },

  form: {
    marginTop: 4,
    marginBottom: wp.space.block,
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
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    padding: 0,
    minHeight: 22,
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 15,
    letterSpacing: 0.5,
    color: wp.color.ink,
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontStyle: 'italic',
    fontSize: 15,
    color: wp.color.ink3,
  },

  buttonWrap: {
    marginTop: 8,
    position: 'relative',
    marginRight: 3,
    marginBottom: 3,
  },
  buttonShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: wp.color.lineD,
  },
  button: {
    height: 54,
    backgroundColor: wp.color.ink,
    borderWidth: 2,
    borderColor: wp.color.lineD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#C9C0A8',
  },
  buttonLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 13,
    letterSpacing: 2,
    color: wp.color.paper,
    textTransform: 'uppercase',
  },
  errorBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: wp.color.red,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(194, 59, 31, 0.07)',
  },
  testButton: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  altLinks: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 8,
    gap: 12,
  },
  altLink: {
    textDecorationLine: 'underline',
    textDecorationColor: wp.color.ink,
  },
  altLinkSub: {
    textDecorationLine: 'underline',
    textDecorationColor: wp.color.ink2,
  },

  footer: {
    alignItems: 'center',
    marginTop: wp.space.block,
  },
});
