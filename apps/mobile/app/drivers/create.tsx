import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useCreateDriver } from '../../src/hooks/useDrivers';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { brand, colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import type { UserRole } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function CreateDriverScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const canManage = hasRole('admin' as UserRole, 'zone_manager' as UserRole, 'location_manager' as UserRole);
  const createMutation = useCreateDriver();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Add Driver' }} />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptySubtitle}>Manager access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email address';
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
        onSuccess: () => router.back(),
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Add Driver',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            <Text style={styles.sectionSubtitle}>
              An invitation email will be sent to the driver to create their account.
            </Text>

            <View style={styles.form}>
              <Input
                label="Full Name *"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter driver's full name"
                error={errors.fullName}
              />
              <Input
                label="Email *"
                value={email}
                onChangeText={setEmail}
                placeholder="driver@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number (optional)"
                keyboardType="phone-pad"
              />
              <Input
                label="License Number"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="Driver's license (optional)"
              />
              <Input
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes (optional)"
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>

          <View style={styles.submitRow}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => router.back()}
              style={{ flex: 1 }}
            />
            <Button
              title="Send Invitation"
              onPress={handleCreate}
              loading={createMutation.isPending}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  submitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
