import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { referenceApi, type Supplier } from '../../src/api/reference';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import { STALE_TIME } from '../../src/constants/config';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // The reference API returns all suppliers; find the one we need
  const suppliers = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then((r) => r.data),
    staleTime: STALE_TIME,
  });

  const allSuppliers: Supplier[] =
    (suppliers.data as any)?.suppliers ?? suppliers.data ?? [];
  const supplier = allSuppliers.find((s) => s.id === id);

  if (suppliers.isLoading) {
    return <Loading fullScreen message="Loading supplier..." />;
  }

  if (!supplier) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Supplier',
            headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
            headerTintColor: colors.white,
          }}
        />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>Supplier not found</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: supplier.name,
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header card */}
          <Card>
            <View style={styles.headerRow}>
              <View style={styles.icon}>
                <Ionicons name="business" size={32} color={colors.brown[500]} />
              </View>
              <Text style={styles.supplierName}>{supplier.name}</Text>
            </View>
          </Card>

          {/* Contact details */}
          <Card>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.detailList}>
              <DetailRow
                icon="person"
                label="Contact Name"
                value={supplier.contact_name ?? '—'}
              />
              <DetailRow
                icon="call"
                label="Phone"
                value={supplier.contact_phone ?? '—'}
              />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={18} color={colors.gray[400]} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { alignItems: 'center', gap: spacing.md },
  icon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.brown[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  detailList: { gap: spacing.md },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
});
