import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '../../src/api/client';
import { referenceApi } from '../../src/api/reference';
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

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Zone mgr', value: 'zone_manager' },
  { label: 'Loc mgr', value: 'location_manager' },
  { label: 'Veh mgr', value: 'vehicle_manager' },
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
    mutationFn: (data: {
      email: string;
      role: string;
      full_name?: string;
      location_id?: string;
    }) =>
      api
        .post<{
          success: boolean;
          message: string;
          email_sent: boolean;
          invitation: {
            id: string;
            email: string;
            role: string;
            short_code: string;
            expires_at: string;
            token: string;
          };
        }>('/api/invitations', data)
        .then((r) => r.data),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['users'] });
      router.replace({
        pathname: '/invite-success',
        params: {
          code: data.invitation.short_code,
          recipient: fullName.trim() || email.trim(),
          role: selectedRole,
          emailSent: data.email_sent ? '1' : '0',
        },
      });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.response?.data?.detail ?? 'Failed to send invitation');
    },
  });

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

  const canSubmit = email.trim().length > 0 && email.includes('@');

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('Invalid', 'Please enter a valid email address');
      return;
    }
    invite.mutate({
      email: email.trim(),
      role: selectedRole,
      full_name: fullName.trim() || undefined,
      location_id: selectedLocationId ?? undefined,
    });
  };

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
              kicker={`NEW USER — ${fmtKickerDate()}`}
              title="Invite user"
              backUseRouter
            />
            <View style={styles.body}>
              <IntentStrip>
                Send an invitation email. The recipient sets their own password when they accept.
              </IntentStrip>

              <MonoInput
                label="Email · required"
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <MonoInput
                label="Full name · optional"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Person's full name"
              />

              <View style={styles.subSection}>
                <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
                  Role · required
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
                  Location · optional
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
          </ScrollView>
        </KeyboardAvoidingView>
        <PrimaryBar
          label="Send invitation"
          onPress={handleSubmit}
          loading={invite.isPending}
          disabled={!canSubmit}
        />
      </SafeAreaView>
    </PaperBackground>
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
  scroll: { paddingBottom: 160 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
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
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.section,
  },
});
