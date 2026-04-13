import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { brand, colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import { APP_VERSION } from '../../src/constants/config';
import { useLogin } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) return;
    login.mutate({ email: email.trim(), password });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>🥔</Text>
            <Text style={styles.title}>Potato Stock</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={login.isPending}
              disabled={!email.trim() || !password.trim()}
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Potato Stock v{APP_VERSION}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.gradientStart,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.gray[400],
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
});
