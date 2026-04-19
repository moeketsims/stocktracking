import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useCreateDriver } from '../../src/hooks/useDrivers';
import { useAuthStore } from '../../src/stores/authStore';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  MonoInput,
  MonoText,
  PrimaryBar,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { UserRole } from '../../src/types';

export default function CreateDriverScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const canManage = hasRole(
    'admin' as UserRole,
    'zone_manager' as UserRole,
    'location_manager' as UserRole,
  );
  const createMutation = useCreateDriver();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!canManage) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="ACCESS" title="Denied" backUseRouter />
          <View style={styles.denied}>
            <MonoText size={11} tracking={1.5} upper color={wp.color.ink3}>
              Manager access required
            </MonoText>
          </View>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'NAME REQUIRED';
    if (!email.trim()) e.email = 'EMAIL REQUIRED';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'INVALID EMAIL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    createMutation.mutate(
      {
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        license_number: licenseNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          // Replace this screen so the back button from invite-success
          // returns to the drivers list, not back into the empty form.
          router.replace({
            pathname: '/invite-success',
            params: {
              code: data.short_code,
              recipient: fullName.trim() || email.trim(),
              role: 'driver',
              phone: phone.trim() || '',
              emailSent: data.email_sent ? '1' : '0',
            },
          });
        },
      },
    );
  };

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0;

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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Masthead
              kicker={`NEW DRIVER — ${fmtKickerDate()}`}
              title="Add driver"
              backUseRouter
            />
            <View style={styles.body}>
              <IntentStrip>
                We'll send an invitation email to the driver. They'll set their own password
                when they accept.
              </IntentStrip>

              <MonoInput
                label="Full name · required"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Driver's full name"
              />
              {errors.fullName && (
                <MonoText size={9} tracking={1} upper color={wp.color.red}>
                  {errors.fullName}
                </MonoText>
              )}
              <MonoInput
                label="Email · required"
                value={email}
                onChangeText={setEmail}
                placeholder="driver@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <MonoText size={9} tracking={1} upper color={wp.color.red}>
                  {errors.email}
                </MonoText>
              )}
              <MonoInput
                label="Phone · optional"
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <MonoInput
                label="License · optional"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="License number"
              />
              <MonoInput
                label="Notes · optional"
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything else"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <PrimaryBar
          label="Send invitation"
          onPress={handleCreate}
          loading={createMutation.isPending}
          disabled={!canSubmit}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 160 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.section,
  },
});
