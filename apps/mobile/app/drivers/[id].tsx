import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDriver, useUpdateDriver, useDeactivateDriver, useResendInvitation } from '../../src/hooks/useDrivers';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';
import type { UserRole, InvitationStatus } from '../../src/types';

const STATUS_BADGE: Record<InvitationStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending Invitation', variant: 'warning' },
  expired: { label: 'Invitation Expired', variant: 'error' },
  no_invitation: { label: 'No Invitation', variant: 'neutral' },
};

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const canManage = hasRole('admin' as UserRole, 'zone_manager' as UserRole, 'location_manager' as UserRole);

  const { data: driver, isLoading } = useDriver(id);
  const updateMutation = useUpdateDriver();
  const deactivateMutation = useDeactivateDriver();
  const resendMutation = useResendInvitation();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (driver) {
      setFullName(driver.full_name ?? '');
      setPhone(driver.phone ?? '');
      setLicenseNumber(driver.license_number ?? '');
      setNotes(driver.notes ?? '');
    }
  }, [driver]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Driver Details' }} />
        <Loading message="Loading driver..." fullScreen />
      </SafeAreaView>
    );
  }

  if (!driver) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Driver Details' }} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Driver not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusBadge = STATUS_BADGE[driver.invitation_status] ?? STATUS_BADGE.no_invitation;

  const handleSave = () => {
    updateMutation.mutate(
      {
        id,
        data: {
          full_name: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          license_number: licenseNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Driver',
      `Are you sure you want to deactivate ${driver.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            deactivateMutation.mutate(id, {
              onSuccess: () => router.back(),
            });
          },
        },
      ],
    );
  };

  const handleResendInvitation = () => {
    resendMutation.mutate(id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: driver.full_name ?? 'Driver Details',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status card */}
          <Card>
            <View style={styles.statusRow}>
              <View style={[styles.avatar, !driver.is_active && styles.avatarInactive]}>
                <Text style={styles.avatarText}>
                  {(driver.full_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text style={styles.driverName}>{driver.full_name}</Text>
                <View style={styles.badgeRow}>
                  <Badge label={statusBadge.label} variant={statusBadge.variant} />
                  {!driver.is_active && <Badge label="Inactive" variant="neutral" />}
                </View>
              </View>
            </View>
          </Card>

          {/* Detail / edit card */}
          <Card>
            <Text style={styles.sectionTitle}>
              {editing ? 'Edit Details' : 'Details'}
            </Text>

            {editing ? (
              <View style={styles.form}>
                <Input
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Driver name"
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
                <Input
                  label="License Number"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="License number"
                />
                <Input
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.buttonRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditing(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Save"
                    onPress={handleSave}
                    loading={updateMutation.isPending}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.detailList}>
                <DetailRow icon="person" label="Name" value={driver.full_name} />
                <DetailRow icon="call" label="Phone" value={driver.phone ?? '---'} />
                <DetailRow icon="mail" label="Email" value={driver.email ?? '---'} />
                <DetailRow icon="card" label="License" value={driver.license_number ?? '---'} />
                {driver.notes ? (
                  <DetailRow icon="document-text" label="Notes" value={driver.notes} />
                ) : null}
              </View>
            )}
          </Card>

          {/* Actions */}
          {canManage && !editing && (
            <Card>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionButtons}>
                <Button
                  title="Edit Driver"
                  variant="outline"
                  onPress={() => setEditing(true)}
                  icon={<Ionicons name="create-outline" size={18} color={colors.primary[500]} />}
                />
                {(driver.invitation_status === 'pending' || driver.invitation_status === 'expired') && (
                  <Button
                    title="Resend Invitation"
                    variant="secondary"
                    onPress={handleResendInvitation}
                    loading={resendMutation.isPending}
                    icon={<Ionicons name="mail-outline" size={18} color={colors.gray[800]} />}
                  />
                )}
                {driver.is_active && (
                  <Button
                    title="Deactivate Driver"
                    variant="danger"
                    onPress={handleDeactivate}
                    loading={deactivateMutation.isPending}
                    icon={<Ionicons name="close-circle-outline" size={18} color={colors.white} />}
                  />
                )}
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.gray[400]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: {
    backgroundColor: colors.gray[300],
  },
  avatarText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  driverName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  detailList: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    fontWeight: fontWeight.medium,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.gray[800],
  },
  actionButtons: {
    gap: spacing.sm,
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
});
