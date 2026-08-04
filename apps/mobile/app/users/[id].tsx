import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  HardShadowFrame,
  ActionStack,
  MonoInput,
  IntentStrip,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';
import type { UserRole } from '../../src/types';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Zone mgr', value: 'zone_manager' },
  { label: 'Loc mgr', value: 'location_manager' },
  { label: 'Veh mgr', value: 'vehicle_manager' },
  { label: 'Driver', value: 'driver' },
  { label: 'Staff', value: 'staff' },
];

const ROLE_COLOR: Record<string, string> = {
  admin: wp.color.red,
  zone_manager: wp.color.amber,
  location_manager: '#1F3A8A',
  vehicle_manager: '#5B2CA5',
  driver: wp.color.green,
  staff: wp.color.ink3,
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

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

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
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="ACCESS" title="Denied" backUseRouter />
          <View style={styles.denied}>
            <MonoText size={11} tracking={1.5} upper color={wp.color.ink3}>
              Admin access required
            </MonoText>
          </View>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  if (isLoading || !user) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
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
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleToggleActive = () => {
    const action = user.is_active ? 'Deactivate' : 'Activate';
    Alert.alert(`${action} user`, `${action} ${user.full_name ?? 'this user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: user.is_active ? 'destructive' : 'default',
        onPress: () => {
          if (user.is_active) deactivate.mutate(user.id);
          else activate.mutate(user.id);
        },
      },
    ]);
  };

  const handleResetPassword = () => {
    Alert.alert('Reset password', `Send reset email to ${user.email ?? 'this user'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => resetPw.mutate(user.id) },
    ]);
  };

  const recordNumber = (user.id ?? '').slice(-4).toUpperCase();
  const roleColor = ROLE_COLOR[user.role] ?? wp.color.ink;
  const roleLabel = formatRole(user.role).toUpperCase();

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Masthead
              kicker={`USER · ${recordNumber}`}
              title={user.full_name ?? user.email ?? 'User'}
              backUseRouter
            />

            <View style={styles.heroWrap}>
              <HardShadowFrame>
                <View style={styles.hero}>
                  <View style={styles.heroTop}>
                    <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                      RECORD N° {recordNumber}
                    </KickerLabel>
                    <Stamp colorHex={user.is_active ? roleColor : wp.color.ink3} rotate={-3}>
                      {user.is_active ? roleLabel : 'OFF'}
                    </Stamp>
                  </View>
                  <SerifNumber size={26} tracking={-1} leading={1.05} style={styles.heroName}>
                    {user.full_name ?? '(No name)'}
                  </SerifNumber>
                  <View style={styles.metaList}>
                    <MetaRow label="Email" value={user.email ?? '—'} />
                    <MetaRow label="Phone" value={user.phone ?? '—'} />
                    <MetaRow label="Location" value={user.location_name ?? 'Unassigned'} />
                    <MetaRow label="Zone" value={user.zone_name ?? '—'} />
                    <MetaRow
                      label="Created"
                      value={
                        user.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'
                      }
                    />
                  </View>
                </View>
              </HardShadowFrame>
            </View>

            {editing && (
              <View style={styles.formWrap}>
                <IntentStrip>Update name, role and location. Email cannot be changed.</IntentStrip>
                <MonoInput label="Full name" value={fullName} onChangeText={setFullName} />
                <MonoInput
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <View style={styles.subSection}>
                  <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                    Role
                  </MonoText>
                  <View style={styles.chipWrap}>
                    {ROLES.map((r) => {
                      const active = selectedRole === r.value;
                      return (
                        <TouchableOpacity
                          key={r.value}
                          activeOpacity={0.7}
                          onPress={() => setSelectedRole(r.value)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <MonoText
                            size={10}
                            tracking={1.2}
                            upper
                            weight={active ? 700 : 500}
                            color={active ? wp.color.paper : wp.color.ink}
                          >
                            {r.label}
                          </MonoText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.subSection}>
                  <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                    Location
                  </MonoText>
                  <View style={styles.locList}>
                    <LocOption
                      label="Unassigned"
                      active={selectedLocationId === null}
                      onPress={() => setSelectedLocationId(null)}
                    />
                    {(locations.data ?? []).map((loc: any) => (
                      <LocOption
                        key={loc.id}
                        label={loc.name + (loc.zone_name ? ` · ${loc.zone_name}` : '')}
                        active={selectedLocationId === loc.id}
                        onPress={() => setSelectedLocationId(loc.id)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.actionsWrap}>
              {editing ? (
                <ActionStack
                  actions={[
                    {
                      label: 'Save changes',
                      onPress: handleSave,
                      filled: true,
                      loading: updateUser.isPending,
                    },
                    { label: 'Cancel', onPress: () => setEditing(false), color: wp.color.ink3 },
                  ]}
                />
              ) : (
                <ActionStack
                  actions={[
                    { label: 'Edit user', onPress: () => setEditing(true) },
                    {
                      label: 'Reset password',
                      onPress: handleResetPassword,
                      loading: resetPw.isPending,
                      color: wp.color.amber,
                    },
                    {
                      label: user.is_active ? 'Deactivate' : 'Activate',
                      onPress: handleToggleActive,
                      color: user.is_active ? wp.color.red : wp.color.green,
                      loading: deactivate.isPending || activate.isPending,
                    },
                  ]}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <MonoText
        size={10}
        tracking={1.5}
        upper
        weight={600}
        color={wp.color.ink3}
        style={{ width: 80 }}
      >
        {label}
      </MonoText>
      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

function LocOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.locItem, active && styles.locItemActive]}
    >
      <MonoText
        size={11}
        tracking={1}
        upper
        weight={active ? 700 : 500}
        color={active ? wp.color.paper : wp.color.ink}
      >
        {active ? '■ ' : '□ '}
        {label}
      </MonoText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 60 },
  heroWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },
  hero: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroName: { marginTop: 10 },
  metaList: { marginTop: 14, gap: 8 },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    alignItems: 'baseline',
  },
  metaValue: {
    flex: 1,
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  formWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    gap: 4,
  },
  subSection: {
    paddingTop: 16,
    gap: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: wp.color.ink,
  },
  locList: {
    borderWidth: 1,
    borderColor: wp.color.lineD,
    maxHeight: 240,
  },
  locItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  locItemActive: {
    backgroundColor: wp.color.ink,
  },
  actionsWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.section,
  },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.section,
  },
});
