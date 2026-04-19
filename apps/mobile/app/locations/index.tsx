import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useLocations, useZones } from '../../src/hooks/useLocations';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  TabStrip,
  LedgerRow,
  Stamp,
  MonoText,
  KickerLabel,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import type { LocationDetail } from '../../src/api/locations';

type Filter = 'all' | 'shop' | 'warehouse';

export default function LocationsListScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const locations = useLocations();
  const zones = useZones();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const all = locations.data?.locations ?? [];

  const counts = useMemo(() => {
    let shop = 0, warehouse = 0;
    for (const l of all) {
      if (l.type === 'shop') shop++;
      else if (l.type === 'warehouse') warehouse++;
    }
    return { all: all.length, shop, warehouse };
  }, [all]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter((l) => {
      if (filter !== 'all' && l.type !== filter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.address ?? '').toLowerCase().includes(q) ||
        (l.zone_name ?? '').toLowerCase().includes(q)
      );
    });
    const map = new Map<string, { zoneName: string; items: LocationDetail[] }>();
    for (const loc of filtered) {
      const key = loc.zone_id || 'unassigned';
      const name = loc.zone_name ?? 'Unassigned';
      if (!map.has(key)) map.set(key, { zoneName: name, items: [] });
      map.get(key)!.items.push(loc);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].zoneName.localeCompare(b[1].zoneName),
    );
  }, [all, filter, search]);

  if (locations.isLoading) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  let rowIdx = 0;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={locations.isRefetching}
              onRefresh={() => {
                locations.refetch();
                zones.refetch();
              }}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            kicker={`SITE ROSTER — ${fmtKickerDate()}`}
            title="Locations"
            backUseRouter
          />

          <TabStrip<Filter>
            items={[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'shop', label: 'Shops', count: counts.shop },
              { key: 'warehouse', label: 'Warehouse', count: counts.warehouse },
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
                placeholder="name · address · zone"
                placeholderTextColor={wp.color.ink3}
                style={styles.searchInput}
              />
            </View>
            {isAdmin && (
              <InkButton label="+ New" onPress={() => router.push('/locations/create')} />
            )}
          </View>

          {grouped.length === 0 ? (
            <View style={styles.empty}>
              <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                {search ? 'No matches' : 'No locations'}
              </MonoText>
            </View>
          ) : (
            grouped.map(([zoneId, group]) => (
              <View key={zoneId}>
                <View style={styles.zoneHead}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                    {group.zoneName}
                  </KickerLabel>
                  <KickerLabel size={9} tracking={1.5} color={wp.color.ink3}>
                    {group.items.length} {group.items.length === 1 ? 'site' : 'sites'}
                  </KickerLabel>
                </View>
                {group.items.map((loc) => {
                  const i = rowIdx++;
                  const isShop = loc.type === 'shop';
                  return (
                    <LedgerRow
                      key={loc.id}
                      idx={i + 1}
                      primary={loc.name}
                      secondary={(loc.address ?? '').toUpperCase() || undefined}
                      trailing={
                        <Stamp
                          colorHex={isShop ? '#1F3A8A' : wp.color.amber}
                          rowIndex={i}
                        >
                          {isShop ? 'SHOP' : 'WHSE'}
                        </Stamp>
                      }
                      onPress={() => router.push(`/locations/${loc.id}`)}
                    />
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
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
  zoneHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 6,
    borderTopWidth: 0,
  },
  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },
});
