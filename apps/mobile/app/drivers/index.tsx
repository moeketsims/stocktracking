import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useDrivers } from '../../src/hooks/useDrivers';
import { useAuthStore } from '../../src/stores/authStore';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  TabStrip,
  LedgerRow,
  Stamp,
  MonoText,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { UserRole, InvitationStatus } from '../../src/types';

type Filter = 'all' | 'active' | 'pending' | 'expired';

const STAMP: Record<InvitationStatus, { label: string; color: string }> = {
  active: { label: 'ACTIVE', color: wp.color.green },
  pending: { label: 'PENDING', color: wp.color.amber },
  expired: { label: 'EXPIRED', color: wp.color.red },
  no_invitation: { label: 'NO INVITE', color: wp.color.ink3 },
};

export default function DriversListScreen() {
  const router = useRouter();
  const hasRole = useAuthStore((s) => s.hasRole);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const canManage = hasRole(
    'admin' as UserRole,
    'zone_manager' as UserRole,
    'location_manager' as UserRole,
  );

  const { data, isLoading, isRefetching, refetch } = useDrivers(false);
  const drivers = data?.drivers ?? [];

  const counts = useMemo(() => {
    let active = 0, pending = 0, expired = 0;
    for (const d of drivers) {
      if (d.invitation_status === 'active') active++;
      else if (d.invitation_status === 'pending') pending++;
      else if (d.invitation_status === 'expired') expired++;
    }
    return { all: drivers.length, active, pending, expired };
  }, [drivers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (filter !== 'all' && d.invitation_status !== filter) return false;
      if (!q) return true;
      return (
        (d.full_name ?? '').toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [drivers, search, filter]);

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

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`DRIVER ROSTER — ${fmtKickerDate()}`}
              title="Drivers"
              backUseRouter
            />

            <TabStrip<Filter>
              items={[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'active', label: 'Active', count: counts.active },
                { key: 'pending', label: 'Pending', count: counts.pending },
                { key: 'expired', label: 'Expired', count: counts.expired },
              ]}
              active={filter}
              onChange={setFilter}
            />

            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Text allowFontScaling={false} style={styles.searchGlyph}>⌕</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="name · email · phone"
                  placeholderTextColor={wp.color.ink3}
                  style={styles.searchInput}
                />
              </View>
              <InkButton label="+ New" onPress={() => router.push('/drivers/create')} />
            </View>

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  {search ? 'No matches' : 'No drivers on file'}
                </MonoText>
              </View>
            ) : (
              filtered.map((d, i) => {
                const stamp = STAMP[d.invitation_status] ?? STAMP.no_invitation;
                const isInactive = !d.is_active;
                const context = [
                  d.phone ?? d.email ?? '',
                  isInactive ? 'INACTIVE' : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <LedgerRow
                    key={d.id}
                    idx={i + 1}
                    primary={d.full_name ?? '(No name)'}
                    secondary={context.toUpperCase() || undefined}
                    trailing={
                      <Stamp
                        colorHex={isInactive ? wp.color.ink3 : stamp.color}
                        rowIndex={i}
                      >
                        {isInactive ? 'OFF' : stamp.label}
                      </Stamp>
                    }
                    onPress={() => router.push(`/drivers/${d.id}`)}
                  />
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
    paddingBottom: 6,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    paddingVertical: 6,
    gap: 8,
  },
  searchGlyph: {
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 12,
    color: wp.color.ink3,
  },
  searchInput: {
    flex: 1,
    fontFamily: wp.font.mono.fontFamily,
    fontSize: 14,
    color: wp.color.ink,
    padding: 0,
  },

  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },

  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp.space.section,
  },
});
