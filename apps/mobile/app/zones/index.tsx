import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useZones, useLocations } from '../../src/hooks/useLocations';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  LedgerRow,
  Stamp,
  MonoText,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

export default function ZonesListScreen() {
  const router = useRouter();
  const zones = useZones();
  const locations = useLocations();

  const zoneList = zones.data?.zones ?? [];
  const allLocations = locations.data?.locations ?? [];

  const stats = useMemo(() => {
    const m = new Map<string, { total: number; shops: number; warehouses: number }>();
    for (const l of allLocations) {
      const s = m.get(l.zone_id) ?? { total: 0, shops: 0, warehouses: 0 };
      s.total++;
      if (l.type === 'shop') s.shops++;
      else if (l.type === 'warehouse') s.warehouses++;
      m.set(l.zone_id, s);
    }
    return m;
  }, [allLocations]);

  if (zones.isLoading || locations.isLoading) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={zones.isRefetching}
              onRefresh={() => {
                zones.refetch();
                locations.refetch();
              }}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            kicker={`ZONE ROSTER — ${fmtKickerDate()}`}
            title="Zones"
            backUseRouter
          />

          {zoneList.length === 0 ? (
            <View style={styles.empty}>
              <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                No zones on file
              </MonoText>
            </View>
          ) : (
            zoneList.map((zone, i) => {
              const s = stats.get(zone.id) ?? { total: 0, shops: 0, warehouses: 0 };
              const ctx = [
                `${s.total} ${s.total === 1 ? 'SITE' : 'SITES'}`,
                s.shops ? `${s.shops} SHOP${s.shops !== 1 ? 'S' : ''}` : null,
                s.warehouses ? `${s.warehouses} WHSE` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <LedgerRow
                  key={zone.id}
                  idx={i + 1}
                  primary={zone.name}
                  secondary={ctx}
                  trailing={
                    <Stamp
                      colorHex={s.total === 0 ? wp.color.ink3 : wp.color.ink}
                      rowIndex={i}
                    >
                      {s.total === 0 ? 'EMPTY' : `N°${String(s.total).padStart(2, '0')}`}
                    </Stamp>
                  }
                  onPress={() => router.push(`/zones/${zone.id}`)}
                />
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },
});
