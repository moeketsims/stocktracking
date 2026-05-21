import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrips } from '../../src/hooks/useTrips';
import { useAuthStore } from '../../src/stores/authStore';
import { Loading } from '../../src/components/ui/Loading';
import { QueryErrorState } from '../../src/components/ui/QueryErrorState';
import {
  PaperBackground,
  Masthead,
  SummaryBand,
  TabStrip,
  MonoText,
  KickerLabel,
  Stamp,
  HardShadowFrame,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import { timeAgo } from '../../src/utils/dates';
import type { Trip, TripStatus } from '../../src/types';

type Filter = 'active' | 'done' | 'all';

const STATUS_STAMP: Record<TripStatus, { label: string; color: string }> = {
  planned: { label: 'PLANNED', color: wp.color.amber },
  in_progress: { label: 'IN TRANSIT', color: wp.color.pipeline.in_delivery ?? '#5B2CA5' },
  completed: { label: 'DONE', color: wp.color.green },
  cancelled: { label: 'CANCELLED', color: wp.color.ink3 },
};

function shortTripNumber(n: string, id?: string): string {
  const m = n.match(/\d+/);
  if (!m) return n.slice(-4).toUpperCase();
  const code = m[0].slice(-4);
  const currentYear = String(new Date().getFullYear());
  return code === currentYear && id ? id.slice(-4).toUpperCase() : code;
}

export default function TripsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = ['admin', 'zone_manager', 'location_manager', 'vehicle_manager'].includes(user?.role ?? '');
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const trips = useTrips();
  const all = trips.data?.trips ?? [];

  const counts = useMemo(() => {
    const wkAgo = Date.now() - 7 * 86400000;
    const monAgo = Date.now() - 30 * 86400000;
    let active = 0, doneWk = 0, doneMo = 0, cancel = 0;
    for (const t of all) {
      if (t.status === 'planned' || t.status === 'in_progress') active++;
      else if (t.status === 'cancelled') cancel++;
      else if (t.status === 'completed') {
        const d = new Date(t.completed_at ?? t.created_at).getTime();
        if (d >= wkAgo) doneWk++;
        if (d >= monAgo) doneMo++;
      }
    }
    return { active, doneWk, doneMo, cancel, all: all.length };
  }, [all]);

  const { activeList, doneList } = useMemo(() => {
    const matches = (t: Trip) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.trip_number.toLowerCase().includes(q) ||
        (t.from_location?.name ?? '').toLowerCase().includes(q) ||
        (t.to_location?.name ?? '').toLowerCase().includes(q) ||
        (t.vehicles?.registration_number ?? '').toLowerCase().includes(q) ||
        (t.driver_name ?? '').toLowerCase().includes(q)
      );
    };
    const a: Trip[] = [];
    const d: Trip[] = [];
    for (const t of all) {
      if (!matches(t)) continue;
      if (t.status === 'planned' || t.status === 'in_progress') a.push(t);
      else d.push(t);
    }
    return { activeList: a, doneList: d };
  }, [all, search]);

  const visibleActive = filter === 'done' ? [] : activeList;
  const visibleDone = filter === 'active' ? [] : doneList;

  return (
    <PaperBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {trips.isLoading ? (
          <Loading fullScreen message="" />
        ) : trips.isError ? (
          <QueryErrorState error={trips.error} onRetry={() => trips.refetch()} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={trips.isRefetching}
                onRefresh={() => trips.refetch()}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`DISPATCH LOG — ${fmtKickerDate()}`}
              title="Trips"
            />

            <SummaryBand
              items={[
                { label: 'Active', value: counts.active },
                { label: 'Done this wk', value: counts.doneWk },
                { label: 'This mo', value: counts.doneMo },
                { label: 'Cancelled', value: counts.cancel, color: wp.color.red },
              ]}
            />

            <TabStrip<Filter>
              items={[
                { key: 'active', label: 'Active', count: counts.active },
                { key: 'done', label: 'Completed', count: counts.doneWk + counts.doneMo },
                { key: 'all', label: 'All' },
              ]}
              active={filter}
              onChange={setFilter}
            />

            {/* Search + New */}
            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Ionicons name="search" size={16} color={wp.color.ink2} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="trip # · reg · driver"
                  placeholderTextColor={wp.color.ink2}
                  style={styles.searchInput}
                />
              </View>
              {isManager && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/trip/create')}
                  style={styles.newPill}
                >
                  <MonoText size={10} weight={700} tracking={1.5} upper color={wp.color.ink}>
                    + New
                  </MonoText>
                </TouchableOpacity>
              )}
            </View>

            {/* Active section */}
            {filter !== 'done' && (
              <>
                <View style={styles.sectionHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    On the road
                  </KickerLabel>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    {activeList.length} {activeList.length === 1 ? 'trip' : 'trips'}
                  </KickerLabel>
                </View>
                <View style={styles.list}>
                  {visibleActive.length === 0 ? (
                    <EmptyRow label={search ? 'No matches' : 'No active trips'} />
                  ) : (
                    visibleActive.map((t, i) => (
                      <TripVoucher
                        key={t.id}
                        trip={t}
                        rowIndex={i}
                        onPress={() => router.push(`/trip/${t.id}`)}
                      />
                    ))
                  )}
                </View>
              </>
            )}

            {/* Completed section */}
            {filter !== 'active' && (
              <>
                <View style={[styles.sectionHead, styles.sectionHeadRule]}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    Completed · recent
                  </KickerLabel>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    {doneList.length} entries
                  </KickerLabel>
                </View>
                <View style={styles.list}>
                  {visibleDone.length === 0 ? (
                    <EmptyRow label={search ? 'No matches' : 'No completed trips yet'} />
                  ) : (
                    visibleDone.map((t, i) => (
                      <TripVoucher
                        key={t.id}
                        trip={t}
                        rowIndex={i}
                        faded
                        onPress={() => router.push(`/trip/${t.id}`)}
                      />
                    ))
                  )}
                </View>
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </PaperBackground>
  );
}

function TripVoucher({
  trip,
  rowIndex,
  faded,
  onPress,
}: {
  trip: Trip;
  rowIndex: number;
  faded?: boolean;
  onPress: () => void;
}) {
  const stamp = STATUS_STAMP[trip.status] ?? STATUS_STAMP.planned;
  const from = trip.origin_description ?? trip.from_location?.name ?? '—';
  const to = trip.destination_description ?? trip.to_location?.name ?? '—';
  const vehicle = trip.vehicles?.registration_number ?? '—';
  const driver = trip.driver_name ?? 'Unassigned';
  const when = trip.completed_at
    ? new Date(trip.completed_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()
    : timeAgo(trip.created_at).toUpperCase();

  return (
    <HardShadowFrame style={{ marginBottom: 10, opacity: faded ? 0.75 : 1 }}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.voucher}>
        <View style={styles.stub}>
          <MonoText size={9} color={wp.color.ink3}>TRIP</MonoText>
          <MonoText size={12} weight={700} color={wp.color.ink}>
            {shortTripNumber(trip.trip_number, trip.id)}
          </MonoText>
        </View>
        <View style={styles.stubDivider}>
          <View style={styles.stubDividerLine} />
        </View>
        <View style={styles.body}>
          <View style={styles.routeRow}>
            <Text allowFontScaling={false} style={styles.routeText} numberOfLines={2}>
              {from}
            </Text>
            <MonoText size={12} color={wp.color.ink3} style={styles.arrow}>
              →
            </MonoText>
            <Text allowFontScaling={false} style={styles.routeText} numberOfLines={2}>
              {to}
            </Text>
          </View>
          <MonoText
            size={9}
            tracking={1.2}
            upper
            color={wp.color.ink2}
            numberOfLines={2}
            style={{ marginTop: 4 }}
          >
            {vehicle} · {driver} · {when}
          </MonoText>
        </View>
        <Stamp colorHex={stamp.color} rowIndex={rowIndex}>
          {stamp.label}
        </Stamp>
      </TouchableOpacity>
    </HardShadowFrame>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
        {label}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderBottomColor: wp.color.lineD,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
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
  newPill: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },

  // Section heads
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionHeadRule: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
  },

  // Voucher list
  list: {
    paddingHorizontal: wp.space.screenH,
  },
  voucher: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 14,
    minHeight: 72,
  },
  stub: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  stubDivider: {
    width: 1,
    justifyContent: 'center',
  },
  stubDividerLine: {
    width: 1,
    height: 48,
    borderLeftWidth: 1,
    borderLeftColor: wp.color.line,
    borderStyle: 'dashed',
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingLeft: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
  },
  routeText: {
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 15,
    color: wp.color.ink,
    flexShrink: 1,
  },
  arrow: {
    includeFontPadding: false,
  },

  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});
