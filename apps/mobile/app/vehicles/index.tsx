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
import { useVehicles } from '../../src/hooks/useVehicles';
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
  SummaryBand,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

type Filter = 'all' | 'available' | 'on_trip' | 'inactive';

export default function VehiclesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = ['admin', 'vehicle_manager'].includes(user?.role ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const vehicles = useVehicles(false);
  const all = vehicles.data ?? [];

  const counts = useMemo(() => {
    let available = 0, onTrip = 0, inactive = 0;
    for (const v of all) {
      if (!v.is_active) inactive++;
      else if (v.current_trip) onTrip++;
      else available++;
    }
    return { all: all.length, available, onTrip, inactive };
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((v) => {
      if (filter === 'available' && (!v.is_active || v.current_trip)) return false;
      if (filter === 'on_trip' && !v.current_trip) return false;
      if (filter === 'inactive' && v.is_active) return false;
      if (!q) return true;
      return (
        v.registration_number.toLowerCase().includes(q) ||
        (v.make ?? '').toLowerCase().includes(q) ||
        (v.model ?? '').toLowerCase().includes(q)
      );
    });
  }, [all, filter, search]);

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {vehicles.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={vehicles.isRefetching}
                onRefresh={() => vehicles.refetch()}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`FLEET ROSTER — ${fmtKickerDate()}`}
              title="Vehicles"
              backUseRouter
            />

            <SummaryBand
              items={[
                { label: 'Total', value: counts.all },
                { label: 'Free', value: counts.available, color: wp.color.green },
                { label: 'On trip', value: counts.onTrip, color: '#5B2CA5' },
                { label: 'Off', value: counts.inactive, color: wp.color.ink3 },
              ]}
            />

            <TabStrip<Filter>
              items={[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'available', label: 'Free', count: counts.available },
                { key: 'on_trip', label: 'Trip', count: counts.onTrip },
                { key: 'inactive', label: 'Off', count: counts.inactive },
              ]}
              active={filter}
              onChange={setFilter}
            />

            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.searchGlyph}>⌕</Text>
                <TextInput
                  maxFontSizeMultiplier={wp.fontScale.text}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="reg · make · model"
                  placeholderTextColor={wp.color.ink3}
                  style={styles.searchInput}
                />
              </View>
              {canManage && (
                <InkButton label="+ New" onPress={() => router.push('/vehicles/create')} />
              )}
            </View>

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  {search ? 'No matches' : 'No vehicles registered'}
                </MonoText>
              </View>
            ) : (
              filtered.map((v, i) => {
                const makeModel = [v.make, v.model].filter(Boolean).join(' ');
                const cap = v.capacity_kg != null ? `${v.capacity_kg} KG` : null;
                const context = [makeModel, cap].filter(Boolean).join(' · ');
                const stamp = !v.is_active
                  ? { label: 'OFF', color: wp.color.ink3 }
                  : v.current_trip
                    ? { label: 'ON TRIP', color: '#5B2CA5' }
                    : { label: 'FREE', color: wp.color.green };
                return (
                  <LedgerRow
                    key={v.id}
                    idx={i + 1}
                    primary={v.registration_number}
                    secondary={context}
                    trailing={
                      <Stamp colorHex={stamp.color} rowIndex={i}>
                        {stamp.label}
                      </Stamp>
                    }
                    onPress={() => router.push(`/vehicles/${v.id}`)}
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
});
