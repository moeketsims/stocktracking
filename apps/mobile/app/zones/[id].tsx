import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useZones, useLocationsByZone } from '../../src/hooks/useLocations';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  HardShadowFrame,
  LedgerRow,
  SummaryBand,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';

export default function ZoneDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const zones = useZones();
  const locationsByZone = useLocationsByZone(id);

  const zone = zones.data?.zones?.find((z) => z.id === id);
  const list = locationsByZone.data?.locations ?? [];
  const shops = list.filter((l) => l.type === 'shop');
  const warehouses = list.filter((l) => l.type === 'warehouse');

  if (zones.isLoading || locationsByZone.isLoading) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  if (!zone) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="ZONE" title="Not found" backUseRouter />
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const recordNumber = (zone.id ?? '').slice(-4).toUpperCase();
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
              refreshing={locationsByZone.isRefetching}
              onRefresh={() => {
                zones.refetch();
                locationsByZone.refetch();
              }}
              tintColor={wp.color.ink2}
            />
          }
        >
          <Masthead
            kicker={`ZONE · ${recordNumber}`}
            title={zone.name}
            backUseRouter
          />

          <View style={styles.heroWrap}>
            <HardShadowFrame>
              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                    RECORD N° {recordNumber}
                  </KickerLabel>
                  <Stamp colorHex={list.length === 0 ? wp.color.ink3 : wp.color.ink} rotate={-3}>
                    {list.length === 0 ? 'EMPTY' : `${list.length} SITES`}
                  </Stamp>
                </View>
                <SerifNumber size={28} tracking={-1.2} leading={1.05} style={styles.heroName}>
                  {zone.name}
                </SerifNumber>
              </View>
            </HardShadowFrame>
          </View>

          <SummaryBand
            items={[
              { label: 'Total', value: list.length },
              { label: 'Shops', value: shops.length, color: '#1F3A8A' },
              { label: 'Warehouse', value: warehouses.length, color: wp.color.amber },
            ]}
          />

          {warehouses.length > 0 && (
            <>
              <View style={styles.sectionHead}>
                <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                  Warehouses
                </KickerLabel>
              </View>
              {warehouses.map((loc) => {
                const i = rowIdx++;
                return (
                  <LedgerRow
                    key={loc.id}
                    idx={i + 1}
                    primary={loc.name}
                    secondary={loc.address || undefined}
                    trailing={
                      <Stamp colorHex={wp.color.amber} rowIndex={i}>
                        WHSE
                      </Stamp>
                    }
                    onPress={() => router.push(`/locations/${loc.id}`)}
                  />
                );
              })}
            </>
          )}

          {shops.length > 0 && (
            <>
              <View style={[styles.sectionHead, styles.sectionHeadRule]}>
                <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                  Shops
                </KickerLabel>
              </View>
              {shops.map((loc) => {
                const i = rowIdx++;
                return (
                  <LedgerRow
                    key={loc.id}
                    idx={i + 1}
                    primary={loc.name}
                    secondary={loc.address || undefined}
                    trailing={
                      <Stamp colorHex="#1F3A8A" rowIndex={i}>
                        SHOP
                      </Stamp>
                    }
                    onPress={() => router.push(`/locations/${loc.id}`)}
                  />
                );
              })}
            </>
          )}

          {list.length === 0 && (
            <View style={styles.empty}>
              <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                No locations assigned yet
              </MonoText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  heroWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    paddingBottom: 16,
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
  heroName: { marginTop: 12 },
  sectionHead: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionHeadRule: {
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: wp.border.mid,
    borderTopColor: wp.color.lineD,
  },
  empty: {
    paddingHorizontal: wp.space.screenH,
    paddingVertical: 40,
    alignItems: 'center',
  },
});
