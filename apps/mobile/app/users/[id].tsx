import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  useUser,
  useUpdateUser,
  useDeactivateUser,
  useActivateUser,
  useResetPassword,
} from '../../src/hooks/useUsers';
import { referenceApi } from '../../src/api/reference';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
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

const ROLE_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'> = {
  admin: 'error',
  zone_manager: 'warning',
  location_manager: 'info',
  vehicle_manager: 'primary',
  driver: 'success',
  staff: 'neutral',
};

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);

  const { data: user, isLoading } = useUser(id ?? '');
  const locations = useQuery({
    queryKey: ['reference', 'locations'],
    queryFn: () => referenceApi.getLocations().then((r) => r.data),
  });

  const updateUser = useUpdateUser();
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const resetPw = useResetPassword();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setPhone(user.phone ?? '');
      setSelectedRole(user.role);
      setSelectedLocationId(user.location_id);
    }
  }, [user]);

  if (!hasRole('admin' as UserRole)) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'User Detail' }} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'User Detail',
            headerStyle: { backgroundColor: brand.gradientStart },
            headerTintColor: colors.white,
          }}
        />
        <Loading message="Loading user..." fullScreen />
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    updateUser.mutate(
      {
        id: user.id,
        data: {
          full_name: fullName || null,
          phone: phone || null,
          role: selectedRole,
          location_id: selectedLocationId,
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleToggleActive = () => {
    const action = user.is_active ? 'deactivate' : 'activate';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} ${user.full_name ?? 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: user.is_active ? 'destructive' : 'default',
          onPress: () => {
            if (user.is_active) {
              deactivate.mutate(user.id);
            } else {
              activate.mutate(user.id);
            }
          },
        },
      ],
    );
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Reset Password',
      `Send a password reset email to ${user.email ?? 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => resetPw.mutate(user.id) },
      ],
    );
  };

  const locationList = locations.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: user.full_name ?? 'User Detail',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: fontWeight.semibold },
          headerRight: () =>
            !isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerBtn}>
                <Ionicons name="create-outline" size={22} color={colors.white} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <Card>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, !user.is_active && styles.avatarInactive]}>
              <Text style={styles.avatarText}>
                {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>{user.full_name ?? '(No name)'}</Text>
              <Text style={styles.profileEmail}>{user.email ?? '—'}</Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={formatRole(user.role)}
                  variant={ROLE_BADGE_VARIANT[user.role] ?? 'neutral'}
                />
                {!user.is_active && <Badge label="Inactive" variant="neutral" />}
              </View>
            </View>
          </View>
        </Card>

        {isEditing ? (
          /* Edit Form */
          <Card>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter full name"
              containerStyle={styles.field}
            />

            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              containerStyle={styles.field}
            />

            {/* Role selector */}
            <Text style={styles.fieldLabel}>Role</Text>
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
                  None (unassigned)
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

            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setIsEditing(false);
                  // Reset form
                  setFullName(user.full_name ?? '');
                  setPhone(user.phone ?? '');
                  setSelectedRole(user.role);
                  setSelectedLocationId(user.location_id);
                }}
                style={styles.formBtn}
              />
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={updateUser.isPending}
                style={styles.formBtn}
              />
            </View>
          </Card>
        ) : (
          /* Detail View */
          <>
            <Card>
              <Text style={styles.sectionTitle}>Details</Text>
              <DetailRow label="Phone" value={user.phone ?? '—'} />
              <DetailRow label="Location" value={user.location_name ?? 'Unassigned'} />
              <DetailRow label="Zone" value={user.zone_name ?? '—'} />
              <DetailRow label="Status" value={user.is_active ? 'Active' : 'Inactive'} />
              <DetailRow
                label="Created"
                value={user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              />
            </Card>

            {/* Actions */}
            <Card>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionList}>
                <Button
                  title={user.is_active ? 'Deactivate User' : 'Activate User'}
                  variant={user.is_active ? 'danger' : 'primary'}
                  onPress={handleToggleActive}
                  loading={deactivate.isPending || activate.isPending}
                  icon={
                    <Ionicons
                      name={user.is_active ? 'close-circle' : 'checkmark-circle'}
                      size={18}
                      color={colors.white}
                    />
                  }
                />
                <Button
                  title="Reset Password"
                  variant="outline"
                  onPress={handleResetPassword}
                  loading={resetPw.isPending}
                  icon={<Ionicons name="key" size={18} color={colors.primary[500]} />}
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  headerBtn: { marginRight: spacing.md },

  // Profile header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInactive: { backgroundColor: colors.gray[300] },
  avatarText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  profileMeta: { flex: 1, gap: 2 },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  profileEmail: { fontSize: fontSize.sm, color: colors.gray[500] },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },

  // Section
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },

  // Edit form
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

  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  formBtn: { flex: 1 },

  // Actions
  actionList: { gap: spacing.md },

  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
});
