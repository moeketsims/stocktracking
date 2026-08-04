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
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { referenceApi, type Supplier } from '../../src/api/reference';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  LedgerRow,
  Stamp,
  MonoText,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';
import { STALE_TIME } from '../../src/constants/config';

export default function SuppliersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then((r) => r.data),
    staleTime: STALE_TIME,
  });

  const all: Supplier[] = (suppliers.data as any)?.suppliers ?? suppliers.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact_name ?? '').toLowerCase().includes(q) ||
        (s.contact_phone ?? '').toLowerCase().includes(q),
    );
  }, [all, search]);

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {suppliers.isLoading ? (
          <Loading fullScreen message="" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={suppliers.isRefetching}
                onRefresh={() => suppliers.refetch()}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`SUPPLIER ROSTER — ${fmtKickerDate()}`}
              title="Suppliers"
              backUseRouter
            />

            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.searchGlyph}>⌕</Text>
                <TextInput
                  maxFontSizeMultiplier={wp.fontScale.text}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="name · contact · phone"
                  placeholderTextColor={wp.color.ink3}
                  style={styles.searchInput}
                />
              </View>
            </View>

            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <MonoText size={11} tracking={1} upper color={wp.color.ink3}>
                  {search ? 'No matches' : 'No suppliers on file'}
                </MonoText>
              </View>
            ) : (
              filtered.map((s, i) => {
                const ctx = [s.contact_name, s.contact_phone].filter(Boolean).join(' · ');
                return (
                  <LedgerRow
                    key={s.id}
                    idx={i + 1}
                    primary={s.name}
                    secondary={ctx || undefined}
                    trailing={
                      <Stamp colorHex={wp.color.ink} rowIndex={i}>
                        {`N°${String(i + 1).padStart(2, '0')}`}
                      </Stamp>
                    }
                    onPress={() => router.push(`/suppliers/${s.id}`)}
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
