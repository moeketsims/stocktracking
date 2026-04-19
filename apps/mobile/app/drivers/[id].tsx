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
import {
  useDriver,
  useUpdateDriver,
  useDeactivateDriver,
  useResendInvitation,
} from '../../src/hooks/useDrivers';
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
import type { UserRole, InvitationStatus } from '../../src/types';

const STAMP: Record<InvitationStatus, { label: string; color: string }> = {
  active: { label: 'ACTIVE', color: wp.color.green },
  pending: { label: 'PENDING', color: wp.color.amber },
  expired: { label: 'EXPIRED', color: wp.color.red },
  no_invitation: { label: 'NO INVITE', color: wp.color.ink3 },
};

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const canManage = hasRole(
    'admin' as UserRole,
    'zone_manager' as UserRole,
    'location_manager' as UserRole,
  );

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
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  if (!driver) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="DRIVER" title="Not found" backUseRouter />
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const stamp = STAMP[driver.invitation_status] ?? STAMP.no_invitation;

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
    Alert.alert('Deactivate driver', `Stand down ${driver.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => deactivateMutation.mutate(id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  const recordNumber = (driver.id ?? '').slice(-4).toUpperCase();
  const showResend =
    driver.invitation_status === 'pending' || driver.invitation_status === 'expired';

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Masthead
              kicker={`DRIVER · ${recordNumber}`}
              title={driver.full_name ?? 'Driver'}
              backUseRouter
            />

            {/* Voucher hero */}
            <View style={styles.heroWrap}>
              <HardShadowFrame>
                <View style={styles.hero}>
                  <View style={styles.heroTop}>
                    <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                      RECORD N° {recordNumber}
                    </KickerLabel>
                    <Stamp colorHex={driver.is_active ? stamp.color : wp.color.ink3} rotate={-3}>
                      {driver.is_active ? stamp.label : 'OFF'}
                    </Stamp>
                  </View>
                  <SerifNumber size={26} tracking={-1} leading={1.05} style={styles.heroName}>
                    {driver.full_name ?? '(No name)'}
                  </SerifNumber>
                  <View style={styles.metaList}>
                    <MetaRow label="Email" value={driver.email ?? '—'} />
                    <MetaRow label="Phone" value={driver.phone ?? '—'} />
                    <MetaRow label="License" value={driver.license_number ?? '—'} />
                    {driver.notes ? <MetaRow label="Notes" value={driver.notes} /> : null}
                  </View>
                </View>
              </HardShadowFrame>
            </View>

            {/* Edit form */}
            {editing && canManage && (
              <View style={styles.formWrap}>
                <IntentStrip>Update the driver's contact and license details.</IntentStrip>
                <MonoInput label="Full name" value={fullName} onChangeText={setFullName} />
                <MonoInput
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <MonoInput
                  label="License number"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                />
                <MonoInput label="Notes · optional" value={notes} onChangeText={setNotes} />
              </View>
            )}

            {/* Actions */}
            {canManage && (
              <View style={styles.actionsWrap}>
                {editing ? (
                  <ActionStack
                    actions={[
                      {
                        label: 'Save changes',
                        onPress: handleSave,
                        filled: true,
                        loading: updateMutation.isPending,
                      },
                      { label: 'Cancel', onPress: () => setEditing(false), color: wp.color.ink3 },
                    ]}
                  />
                ) : (
                  <ActionStack
                    actions={[
                      { label: 'Edit driver', onPress: () => setEditing(true) },
                      ...(showResend
                        ? [
                            {
                              label: 'Resend invitation',
                              onPress: () => resendMutation.mutate(id),
                              loading: resendMutation.isPending,
                              color: wp.color.amber,
                            },
                          ]
                        : []),
                      ...(driver.is_active
                        ? [
                            {
                              label: 'Deactivate',
                              onPress: handleDeactivate,
                              color: wp.color.red,
                              loading: deactivateMutation.isPending,
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <MonoText size={10} tracking={1.5} upper weight={600} color={wp.color.ink3} style={{ width: 80 }}>
        {label}
      </MonoText>
      <Text allowFontScaling={false} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  heroName: {
    marginTop: 10,
  },
  metaList: {
    marginTop: 14,
    gap: 8,
  },
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
  actionsWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.section,
  },
});
