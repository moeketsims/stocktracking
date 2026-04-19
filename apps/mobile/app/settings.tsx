import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useLogout } from '../src/hooks/useAuth';
import {
  useLocations,
  useLocationThresholds,
  useUpdateThresholds,
} from '../src/hooks/useLocations';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  InkButton,
  IntentStrip,
} from '../src/components/wp';
import { wp, fmtKickerDate } from '../src/constants/warehousePaper';
import { APP_VERSION } from '../src/constants/config';
import { clearPin } from '../src/utils/pin';

function formatRole(role?: string): string {
  if (!role) return '—';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const pinEnabled = useAuthStore((s) => s.pinConfigured);
  const refreshPinConfigured = useAuthStore((s) => s.refreshPinConfigured);
  const logout = useLogout();

  const handleChangePin = () => {
    router.push('/(auth)/pin-setup?mode=change');
  };

  const handleDisablePin = () => {
    Alert.alert(
      'Turn off PIN?',
      'You will sign in with email and password every time you open the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: async () => {
            await clearPin();
            await refreshPinConfigured();
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    // Clear local PIN before backend logout so a future sign-in starts
    // fresh (forces pin-setup again on the new session).
    await clearPin();
    logout.mutate();
  };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Masthead
            kicker={`PREFERENCES — ${fmtKickerDate()}`}
            title="Settings"
            backUseRouter
          />

          {/* Profile ID plate */}
          <View style={styles.body}>
            <View style={styles.section}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                Identification
              </KickerLabel>
            </View>
            <ProfileRow label="Name" value={user?.full_name ?? '—'} />
            <ProfileRow label="Email" value={user?.email ?? '—'} mono />
            <ProfileRow label="Role" value={formatRole(user?.role)} />
            <ProfileRow label="Location" value={user?.location_name ?? 'All locations'} />
            <ProfileRow label="Zone" value={user?.zone_name ?? '—'} />

            {isAdmin() && <ThresholdsSection />}

            {/* Security */}
            <View style={[styles.section, { marginTop: wp.space.block }]}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                Security
              </KickerLabel>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleChangePin}
              disabled={pinEnabled === false}
              style={[styles.actionRow, pinEnabled === false && { opacity: 0.4 }]}
            >
              <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink3}>
                Change PIN
              </MonoText>
              <Text allowFontScaling={false} style={styles.actionChev}>
                ›
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={pinEnabled ? handleDisablePin : handleChangePin}
              style={styles.actionRow}
            >
              <MonoText
                size={11}
                tracking={1}
                upper
                weight={600}
                color={pinEnabled ? wp.color.amber : wp.color.ink3}
              >
                {pinEnabled === false ? 'Set up a PIN' : 'Turn off PIN'}
              </MonoText>
              <Text allowFontScaling={false} style={styles.actionChev}>
                ›
              </Text>
            </TouchableOpacity>

            <View style={[styles.section, { marginTop: wp.space.block }]}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                Application
              </KickerLabel>
            </View>
            <ProfileRow label="Version" value={`v${APP_VERSION}`} mono />

            <View style={styles.signOutWrap}>
              <View pointerEvents="none" style={styles.signOutShadow} />
              <TouchableOpacity
                onPress={handleSignOut}
                disabled={logout.isPending}
                activeOpacity={0.85}
                style={[styles.signOutButton, logout.isPending && { opacity: 0.6 }]}
              >
                {logout.isPending ? (
                  <ActivityIndicator color={wp.color.red} size="small" />
                ) : (
                  <Text allowFontScaling={false} style={styles.signOutLabel}>
                    Sign out
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function ProfileRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink3}>
        {label}
      </MonoText>
      <Text
        allowFontScaling={false}
        style={[styles.rowValue, mono && styles.rowValueMono]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function ThresholdsSection() {
  const { data: locationsData, isLoading: locationsLoading } = useLocations();
  const locations = locationsData?.locations ?? [];

  const [selectedId, setSelectedId] = useState('');
  const [critical, setCritical] = useState('');
  const [low, setLow] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: thresholds, isLoading: thresholdsLoading } =
    useLocationThresholds(selectedId);
  const updateMutation = useUpdateThresholds();

  const selected = locations.find((l) => l.id === selectedId);

  useEffect(() => {
    if (thresholds) {
      setCritical(thresholds.critical_stock_threshold?.toString() ?? '');
      setLow(thresholds.low_stock_threshold?.toString() ?? '');
    }
  }, [thresholds]);

  useEffect(() => {
    setError('');
    setSuccess('');
  }, [selectedId]);

  const handleSave = () => {
    setError('');
    setSuccess('');
    if (!selectedId) return setError('Pick a site');
    const c = parseInt(critical, 10);
    const l = parseInt(low, 10);
    if (!critical || !low || isNaN(c) || isNaN(l)) return setError('Both values required');
    if (c >= l) return setError('Critical must be lower than low');
    updateMutation.mutate(
      { id: selectedId, data: { critical_stock_threshold: c, low_stock_threshold: l } },
      {
        onSuccess: () => {
          setSuccess(`Updated — ${selected?.name ?? 'site'}`);
          setSelectedId('');
        },
        onError: (err: any) => {
          setError(err.response?.data?.detail ?? 'Save failed');
        },
      },
    );
  };

  return (
    <>
      <View style={[styles.section, { marginTop: wp.space.block }]}>
        <KickerLabel size={10} tracking={2} color={wp.color.ink}>
          Stock thresholds
        </KickerLabel>
      </View>
      <View style={styles.thresholdBody}>
        <IntentStrip>
          Set the alert levels for each site. Critical triggers a red stamp and
          pages the zone manager; low stock triggers an amber warning.
        </IntentStrip>

        {locationsLoading ? (
          <ActivityIndicator size="small" color={wp.color.ink3} />
        ) : (
          <>
            {/* Site picker — inline ledger list */}
            <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
              Site
            </MonoText>
            <View style={styles.siteList}>
              {locations.map((loc) => {
                const active = loc.id === selectedId;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedId(active ? '' : loc.id)}
                    style={[styles.siteRow, active && styles.siteRowActive]}
                  >
                    <MonoText
                      size={10}
                      tracking={1}
                      upper
                      weight={active ? 700 : 500}
                      color={active ? wp.color.paper : wp.color.ink}
                    >
                      {active ? '■ ' : '□ '}
                      {loc.name}
                      {loc.type === 'warehouse' ? ' · WHSE' : ''}
                    </MonoText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedId !== '' && (
              <>
                {thresholdsLoading ? (
                  <ActivityIndicator size="small" color={wp.color.ink3} style={{ marginTop: 12 }} />
                ) : (
                  <>
                    <ThresholdInput
                      label="Critical level · bags"
                      hint="Below this triggers red-alert pages to the zone manager"
                      value={critical}
                      onChange={setCritical}
                    />
                    <ThresholdInput
                      label="Low level · bags"
                      hint="Below this shows an amber warning on the dashboard"
                      value={low}
                      onChange={setLow}
                    />
                    {error !== '' && (
                      <MonoText
                        size={10}
                        tracking={1}
                        upper
                        weight={600}
                        color={wp.color.red}
                        style={{ marginTop: 10 }}
                      >
                        {error}
                      </MonoText>
                    )}
                    <View style={{ marginTop: 14 }}>
                      <InkButton
                        label={`Save — ${selected?.name ?? ''}`}
                        variant="solid"
                        onPress={handleSave}
                        loading={updateMutation.isPending}
                      />
                    </View>
                  </>
                )}
              </>
            )}

            {success !== '' && (
              <MonoText
                size={10}
                tracking={1}
                upper
                weight={600}
                color={wp.color.green}
                style={{ marginTop: 10 }}
              >
                {success}
              </MonoText>
            )}
          </>
        )}
      </View>
    </>
  );
}

function ThresholdInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.thresholdField}>
      <MonoText size={11} tracking={1} upper weight={600} color={wp.color.ink}>
        {label}
      </MonoText>
      <TextInput
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        maxLength={4}
        placeholder="—"
        placeholderTextColor={wp.color.ink3}
        style={styles.thresholdInput}
      />
      <MonoText size={9} tracking={0.8} upper color={wp.color.ink3} style={{ marginTop: 4 }}>
        {hint}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 60 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },
  section: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    gap: 14,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  rowValueMono: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 13,
    letterSpacing: 0.5,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  actionChev: {
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 16,
    color: wp.color.ink3,
    includeFontPadding: false,
  },

  thresholdBody: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  siteList: {
    borderWidth: 1,
    borderColor: wp.color.lineD,
    marginTop: 4,
  },
  siteRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  siteRowActive: {
    backgroundColor: wp.color.ink,
  },
  thresholdField: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  thresholdInput: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 22,
    letterSpacing: 1,
    color: wp.color.ink,
    padding: 0,
    marginTop: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    paddingBottom: 4,
  },

  signOutWrap: {
    marginTop: wp.space.section,
    position: 'relative',
    marginRight: 3,
    marginBottom: 3,
  },
  signOutShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: wp.color.red,
  },
  signOutButton: {
    height: 54,
    backgroundColor: wp.color.paper,
    borderWidth: 2,
    borderColor: wp.color.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 13,
    letterSpacing: 2,
    color: wp.color.red,
    textTransform: 'uppercase',
  },
});
