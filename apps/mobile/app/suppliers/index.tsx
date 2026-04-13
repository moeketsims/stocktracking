import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { referenceApi, type Supplier } from '../../src/api/reference';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import { STALE_TIME } from '../../src/constants/config';

export default function SuppliersScreen() {
  const router = useRouter();
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then((r) => r.data),
    staleTime: STALE_TIME,
  });

  const allSuppliers: Supplier[] = (suppliers.data as any)?.suppliers ?? suppliers.data ?? [];

  const renderSupplier = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/suppliers/${item.id}`)}
    >
      <Card>
        <View style={styles.supplierRow}>
          <View style={styles.supplierIcon}>
            <Ionicons name="business" size={24} color={colors.brown[500]} />
          </View>
          <View style={styles.supplierInfo}>
            <Text style={styles.name}>{item.name}</Text>
            {item.contact_name && (
              <Text style={styles.contact}>{item.contact_name}</Text>
            )}
            {item.contact_phone && (
              <Text style={styles.phone}>{item.contact_phone}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Suppliers',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {suppliers.isLoading ? (
          <Loading fullScreen message="Loading suppliers..." />
        ) : (
          <FlatList
            data={allSuppliers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={suppliers.isRefetching}
                onRefresh={() => suppliers.refetch()}
              />
            }
            renderItem={renderSupplier}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={48} color={colors.gray[300]} />
                <Text style={styles.emptyTitle}>No suppliers</Text>
                <Text style={styles.emptyBody}>No suppliers registered yet.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  list: { padding: spacing.lg, gap: spacing.md },
  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  supplierIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brown[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierInfo: { flex: 1 },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  contact: { fontSize: fontSize.sm, color: colors.gray[600], marginTop: 2 },
  phone: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  emptyBody: { fontSize: fontSize.sm, color: colors.gray[500], textAlign: 'center' },
});
