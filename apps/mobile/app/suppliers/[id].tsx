import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { referenceApi, type Supplier } from '../../src/api/reference';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  HardShadowFrame,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';
import { STALE_TIME } from '../../src/constants/config';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then((r) => r.data),
    staleTime: STALE_TIME,
  });

  const all: Supplier[] = (suppliers.data as any)?.suppliers ?? suppliers.data ?? [];
  const supplier = all.find((s) => s.id === id);

  if (suppliers.isLoading) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  if (!supplier) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="SUPPLIER" title="Not found" backUseRouter />
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const recordNumber = (supplier.id ?? '').slice(-4).toUpperCase();

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Masthead
            kicker={`SUPPLIER · ${recordNumber}`}
            title={supplier.name}
            backUseRouter
          />

          <View style={styles.heroWrap}>
            <HardShadowFrame>
              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                    RECORD N° {recordNumber}
                  </KickerLabel>
                  <Stamp colorHex={wp.color.ink} rotate={-3}>
                    SUPPLIER
                  </Stamp>
                </View>
                <SerifNumber size={26} tracking={-1} leading={1.05} style={styles.heroName}>
                  {supplier.name}
                </SerifNumber>
                <View style={styles.metaList}>
                  <MetaRow label="Contact" value={supplier.contact_name ?? '—'} />
                  <MetaRow label="Phone" value={supplier.contact_phone ?? '—'} />
                </View>
              </View>
            </HardShadowFrame>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <MonoText
        size={10}
        tracking={1.5}
        upper
        weight={600}
        color={wp.color.ink3}
        style={{ width: 80 }}
      >
        {label}
      </MonoText>
      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
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
  heroName: { marginTop: 10 },
  metaList: { marginTop: 14, gap: 8 },
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
});
