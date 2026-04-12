import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useZones, useCreateLocation } from '../../src/hooks/useLocations';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { LocationType } from '../../src/types';

export default function CreateLocationScreen() {
  const router = useRouter();
  const zones = useZones();
  const createLocation = useCreateLocation();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<LocationType>('shop');
  const [zoneId, setZoneId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!zoneId) e.zoneId = 'Please select a zone';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createLocation.mutate(
      {
        name: name.trim(),
        zone_id: zoneId,
        type,
        address: address.trim() || undefined,
      },
      { onSuccess: () => router.back() },
    );
  }

  if (zones.isLoading) return <Loading fullScreen message="Loading zones..." />;

  const zoneList = zones.data?.zones ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'New Location' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>Location Details</Text>

            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sandton Shop"
              error={errors.name}
            />

            <Input
              label="Address (optional)"
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 123 Main Rd, Sandton"
              containerStyle={{ marginTop: spacing.md }}
            />

            {/* Type selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'shop' && styles.typeSelected,
                    type === 'shop' && { borderColor: colors.info },
                  ]}
                  onPress={() => setType('shop')}
                >
                  <Ionicons
                    name="storefront"
                    size={20}
                    color={type === 'shop' ? colors.info : colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      type === 'shop' && { color: colors.info },
                    ]}
                  >
                    Shop
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'warehouse' && styles.typeSelected,
                    type === 'warehouse' && { borderColor: '#d97706' },
                  ]}
                  onPress={() => setType('warehouse')}
                >
                  <Ionicons
                    name="business"
                    size={20}
                    color={type === 'warehouse' ? '#d97706' : colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      type === 'warehouse' && { color: '#d97706' },
                    ]}
                  >
                    Warehouse
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Zone selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Zone</Text>
              {errors.zoneId && <Text style={styles.errorText}>{errors.zoneId}</Text>}
              {zoneList.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={[
                    styles.zoneOption,
                    zoneId === z.id && styles.zoneSelected,
                  ]}
                  onPress={() => setZoneId(z.id)}
                >
                  <Ionicons
                    name={zoneId === z.id ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={zoneId === z.id ? colors.primary[500] : colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.zoneName,
                      zoneId === z.id && { color: colors.primary[700] },
                    ]}
                  >
                    {z.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {zoneList.length === 0 && (
                <Text style={styles.noZones}>No zones available. Create a zone first.</Text>
              )}
            </View>
          </Card>

          <Button
            title="Create Location"
            onPress={handleSubmit}
            loading={createLocation.isPending}
            disabled={createLocation.isPending}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.lg,
  },
  fieldGroup: { marginTop: spacing.lg },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
  typeSelected: { backgroundColor: colors.gray[50] },
  typeLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  zoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  zoneSelected: { backgroundColor: colors.primary[50] },
  zoneName: {
    fontSize: fontSize.md,
    color: colors.gray[700],
  },
  noZones: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: spacing.xs,
  },
});
