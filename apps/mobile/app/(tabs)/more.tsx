import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useLogout } from '../../src/hooks/useAuth';
import { useAlerts } from '../../src/hooks/useAlerts';
import { usePendingDeliveries } from '../../src/hooks/useDeliveries';
import { APP_VERSION } from '../../src/constants/config';
import {
  PaperBackground,
  MonoText,
  KickerLabel,
  Stamp,
  HardShadowFrame,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { UserRole } from '../../src/types';

type StatusTone = 'red' | 'amber' | 'green' | 'ink3';

interface LedgerEntry {
  key: string;
  label: string;
  status?: string;
  tone: StatusTone;
  onPress: () => void;
  visible: boolean;
}

const TONE_COLOR: Record<StatusTone, string> = {
  red: wp.color.red,
  amber: wp.color.amber,
  green: wp.color.green,
  ink3: wp.color.ink3,
};

function roleStamp(role: UserRole | undefined): string {
  switch (role) {
    case 'admin': return 'ADMIN';
    case 'zone_manager': return 'ZONE MGR';
    case 'location_manager': return 'LOC-MGR';
    case 'vehicle_manager': return 'VEH MGR';
    case 'driver': return 'DRIVER';
    case 'staff': return 'STAFF';
    default: return 'USER';
  }
}

export default function BackOfficeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const alerts = useAlerts(user?.location_id ?? undefined);
  const deliveries = usePendingDeliveries();

  const isAdmin = user?.role === 'admin';
  const isAdminOrZone = user?.role === 'admin' || user?.role === 'zone_manager';
  const isManager = ['admin', 'zone_manager', 'location_manager'].includes(user?.role ?? '');
  const canManageVehicles = ['admin', 'vehicle_manager'].includes(user?.role ?? '');

  const alertCount = alerts.data?.active_alerts?.length ?? 0;
  const deliveryCount = deliveries.data?.total ?? 0;

  const entries: LedgerEntry[] = useMemo(() => [
    {
      key: 'alerts',
      label: 'Alerts',
      status: alertCount > 0 ? `${alertCount} open` : 'None',
      tone: alertCount > 0 ? 'red' : 'ink3',
      onPress: () => router.push('/alerts'),
      visible: true,
    },
    {
      key: 'deliveries',
      label: 'Pending deliveries',
      status: deliveryCount > 0 ? `${deliveryCount} inbound` : 'None',
      tone: deliveryCount > 0 ? 'amber' : 'ink3',
      onPress: () => router.push('/alerts'),
      visible: isManager,
    },
    { key: 'loans', label: 'Loans', tone: 'ink3', onPress: () => router.push('/loans'), visible: isManager },
    { key: 'drivers', label: 'Drivers', tone: 'ink3', onPress: () => router.push('/drivers'), visible: isManager },
    { key: 'batches', label: 'Batches', tone: 'ink3', onPress: () => router.push('/stock/batches'), visible: isManager },
    { key: 'users', label: 'User management', tone: 'ink3', onPress: () => router.push('/users'), visible: isManager },
    { key: 'stock-take', label: 'Stock take', tone: 'ink3', onPress: () => router.push('/stock-take'), visible: isManager },
    { key: 'vehicles', label: 'Vehicles', tone: 'ink3', onPress: () => router.push('/vehicles'), visible: canManageVehicles || isManager },
    { key: 'locations', label: 'Locations', tone: 'ink3', onPress: () => router.push('/locations'), visible: isAdminOrZone },
    { key: 'zones', label: 'Zones', tone: 'ink3', onPress: () => router.push('/zones'), visible: isAdminOrZone },
    { key: 'suppliers', label: 'Suppliers', tone: 'ink3', onPress: () => router.push('/suppliers'), visible: isAdmin },
    { key: 'reports', label: 'Reports & analytics', tone: 'ink3', onPress: () => router.push('/reports'), visible: isManager },
    { key: 'notifications', label: 'Notifications', tone: 'ink3', onPress: () => router.push('/notifications'), visible: true },
    { key: 'settings', label: 'Settings', tone: 'ink3', onPress: () => router.push('/settings'), visible: true },
  ], [alertCount, deliveryCount, isAdmin, isAdminOrZone, isManager, canManageVehicles, router]);

  const visible = entries.filter((e) => e.visible);

  const displayName = user?.full_name ?? user?.email?.split('@')[0] ?? 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const emailDisplay = (user?.email ?? '').toUpperCase();
  const locationDisplay = user?.location_name?.toUpperCase();

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Masthead + ID card (per spec, ID card is INSIDE the masthead block) */}
          <View style={[styles.masthead, { paddingTop: Math.max(insets.top + 16, 60) }]}>
            <KickerLabel size={9} tracking={2} color={wp.color.ink3}>
              Staff record — {fmtKickerDate()}
            </KickerLabel>
            <Text allowFontScaling={false} style={styles.title}>
              The Back Office
            </Text>

            <HardShadowFrame offset={2} style={{ marginTop: 16 }}>
              <View style={styles.idCard}>
                <View style={styles.avatar}>
                  <Text allowFontScaling={false} style={styles.avatarText}>
                    {initial}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text allowFontScaling={false} style={styles.idName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <MonoText
                    size={10}
                    tracking={1}
                    color={wp.color.ink3}
                    numberOfLines={1}
                    style={{ marginTop: 2 }}
                  >
                    {emailDisplay}
                  </MonoText>
                  <View style={styles.idMeta}>
                    <Stamp color="ink" rotate={-3}>{roleStamp(user?.role)}</Stamp>
                    {locationDisplay && (
                      <MonoText size={10} tracking={1} color={wp.color.ink3}>
                        {' · '}{locationDisplay}
                      </MonoText>
                    )}
                  </View>
                </View>
              </View>
            </HardShadowFrame>
          </View>

          {/* Menu as ledger */}
          <View style={styles.ledgerWrap}>
            <View style={styles.ledgerHeader}>
              <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={{ flex: 1 }}>
                Entry
              </KickerLabel>
              <KickerLabel size={9} tracking={1.5} color={wp.color.ink3} style={styles.statusCol}>
                Status
              </KickerLabel>
              <View style={styles.chevSpacer} />
            </View>

            {visible.map((entry, i) => (
              <TouchableOpacity
                key={entry.key}
                activeOpacity={0.7}
                onPress={entry.onPress}
                style={[styles.row, i === visible.length - 1 && styles.rowLast]}
              >
                <MonoText size={10} color={wp.color.ink3} style={styles.indexCol}>
                  {String(i + 1).padStart(2, '0')}
                </MonoText>
                <Text allowFontScaling={false} style={styles.entryName}>
                  {entry.label}
                </Text>
                <View style={styles.statusCol}>
                  {entry.status ? (
                    <MonoText
                      size={10}
                      tracking={1}
                      upper
                      color={TONE_COLOR[entry.tone]}
                      style={styles.statusText}
                    >
                      {entry.status}
                    </MonoText>
                  ) : null}
                </View>
                <Text allowFontScaling={false} style={styles.chev}>›</Text>
              </TouchableOpacity>
            ))}

            {/* Sign out: filled and labelled so the red action is unambiguous. */}
            <View style={styles.signOutWrap}>
              <HardShadowFrame offset={1} color={wp.color.red}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => logout.mutate()}
                  disabled={logout.isPending}
                  style={styles.signOutBtn}
                >
                  <Text allowFontScaling={false} style={styles.signOutText}>
                    {logout.isPending ? 'SIGNING OUT...' : 'LOG OUT'}
                  </Text>
                </TouchableOpacity>
              </HardShadowFrame>
            </View>

            <MonoText
              size={9}
              tracking={1}
              color={wp.color.ink3}
              style={styles.version}
            >
              v{APP_VERSION}
            </MonoText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Masthead with embedded ID card
  masthead: {
    paddingHorizontal: wp.space.screenH,
    paddingBottom: 18,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  title: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 36,
    letterSpacing: -1,
    lineHeight: 38,
    color: wp.color.ink,
    marginTop: 4,
  },

  // ID card
  idCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
  },
  avatar: {
    width: 48,
    height: 58,
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 26,
    color: wp.color.paper,
    includeFontPadding: false,
  },
  idName: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 22,
    letterSpacing: -0.5,
    color: wp.color.ink,
  },
  idMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },

  // Ledger
  ledgerWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 10,
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  indexCol: {
    width: 22,
  },
  entryName: {
    flex: 1,
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 17,
    color: wp.color.ink,
  },
  statusCol: {
    width: 110,
  },
  statusText: {
    textAlign: 'right',
  },
  chevSpacer: {
    width: 14,
  },
  chev: {
    width: 14,
    textAlign: 'right',
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 14,
    color: wp.color.ink3,
    includeFontPadding: false,
  },

  // Sign out
  signOutWrap: {
    alignSelf: 'center',
    marginTop: 22,
  },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: wp.color.red,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: wp.color.red,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 11,
    letterSpacing: 2,
    color: wp.color.paper,
    textTransform: 'uppercase',
  },

  version: {
    textAlign: 'center',
    marginTop: 14,
  },
});
