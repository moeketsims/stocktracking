import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/api/client';
import { referenceApi } from '../../src/api/reference';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Loading } from '../../src/components/ui/Loading';
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { UserRole } from '../../src/types';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Zone Manager', value: 'zone_manager' },
  { label: 'Location Manager', value: 'location_manager' },
  { label: 'Vehicle Manager', value: 'vehicle_manager' },
  { label: 'Driver', value: 'driver' },
  { label: 'Staff', value: 'staff' },
];

export default function CreateUserScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const qc = useQueryClient();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const locations = useQuery({
    queryKey: ['reference', 'locations'],
    queryFn: () => referenceApi.getLocations().then((r) => r.data),
  });

  const invite = useMutation({
    mutationFn: (data: { email: string; role: string; full_name?: string; location_id?: string }) =>
      api.post('/api/invitations', data).then((r) => r.data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Invitation Sent', `An invitation email has been sent to ${email}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail ?? 'Failed to send invitation');
    },
  });

  if (!hasRole('admin' as UserRole)) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Invite User' }} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Email is required');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Validation', 'Please enter a valid email address');
      return;
    }

    invite.mutate({
      email: email.trim(),
      role: selectedRole,
      full_name: fullName.trim() || undefined,
      location_id: selectedLocationId ?? undefined,
    });
  };

  const locationList = locations.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Invite User',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>New User Invitation</Text>
          <Text style={styles.description}>
            Send an invitation email. The user will set their own password when they accept.
          </Text>

          <Input
            label="Email *"
            value={email}
            onChangeText={setEmail}
            placeholder="user@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.field}
          />

          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name (optional)"
            containerStyle={styles.field}
          />

          {/* Role selector */}
          <Text style={styles.fieldLabel}>Role *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {ROLES.map((r) => {
              const active = selectedRole === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedRole(r.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Location selector */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Location</Text>
          <ScrollView
            horizontal={false}
            style={styles.locationList}
            nestedScrollEnabled
          >
            <TouchableOpacity
              style={[
                styles.locationItem,
                selectedLocationId === null && styles.locationItemActive,
              ]}
              onPress={() => setSelectedLocationId(null)}
            >
              <Text
                style={[
                  styles.locationItemText,
                  selectedLocationId === null && styles.locationItemTextActive,
                ]}
              >
                None (assign later)
              </Text>
            </TouchableOpacity>
            {locationList.map((loc) => {
              const active = selectedLocationId === loc.id;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.locationItem, active && styles.locationItemActive]}
                  onPress={() => setSelectedLocationId(loc.id)}
                >
                  <Text
                    style={[
                      styles.locationItemText,
                      active && styles.locationItemTextActive,
                    ]}
                  >
                    {loc.name}
                  </Text>
                  {loc.zone_name && (
                    <Text style={styles.locationZone}>{loc.zone_name}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        <Button
          title="Send Invitation"
          onPress={handleSubmit}
          loading={invite.isPending}
          icon={<Ionicons name="mail" size={18} color={colors.white} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['5xl'] },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.lg,
  },
  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  chipRow: { gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
    fontWeight: fontWeight.medium,
  },
  chipTextActive: { color: colors.white },
  locationList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
  },
  locationItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  locationItemActive: {
    backgroundColor: colors.primary[50],
  },
  locationItemText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
  },
  locationItemTextActive: {
    color: colors.primary[700],
    fontWeight: fontWeight.semibold,
  },
  locationZone: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: 1,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
});
