import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransferStock } from '../../src/hooks/useStock';
import { useLocations } from '../../src/hooks/useLocations';
import { useAuthStore } from '../../src/stores/authStore';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Loading } from '../../src/components/ui/Loading';
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

type Unit = 'bag' | 'kg';

export default function TransferStockScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mutation = useTransferStock();
  const { data: locationsData, isLoading: locationsLoading } = useLocations();

  const locations = locationsData?.locations ?? [];
  const otherLocations = locations.filter((l: any) => l.id !== user?.location_id);

  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('bag');
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0 && toLocationId !== '' && user?.location_id;
  const displayKg = unit === 'bag' ? qty * 10 : qty;
  const selectedLocation = otherLocations.find((l: any) => l.id === toLocationId);

  const handleSubmit = () => {
    if (!isValid || !user?.location_id) return;

    const label = unit === 'bag' ? `${qty} bag${qty > 1 ? 's' : ''}` : `${qty} kg`;
    const dest = selectedLocation?.name ?? 'selected location';
    Alert.alert('Transfer Stock', `Transfer ${label} to ${dest}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Transfer',
        onPress: () => {
          mutation.mutate(
            {
              from_location_id: user.location_id!,
              to_location_id: toLocationId,
              quantity: qty,
              unit,
              notes: notes.trim() || undefined,
            },
            {
              onSuccess: (data) => {
                Alert.alert('Success', data.message ?? 'Stock transferred successfully.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              },
            },
          );
        },
      },
    ]);
  };

  if (locationsLoading) {
    return <Loading fullScreen message="Loading locations..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Transfer Stock',
          headerStyle: { backgroundColor: brand.gradientStart },
          headerTintColor: '#fff',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.infoBanner}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  Transfer stock from your location to another. Stock will be deducted from your balance and added to the destination.
                </Text>
              </View>
            </Card>

            {/* From location (read-only) */}
            <Card>
              <Text style={styles.sectionTitle}>From</Text>
              <View style={styles.readOnlyField}>
                <Ionicons name="location" size={18} color={colors.primary[500]} />
                <Text style={styles.readOnlyText}>{user?.location_name ?? 'Your location'}</Text>
              </View>
            </Card>

            {/* To location */}
            <Card>
              <Text style={styles.sectionTitle}>Destination</Text>
              {otherLocations.length === 0 ? (
                <Text style={styles.emptyText}>No other locations available</Text>
              ) : (
                <View style={styles.locationList}>
                  {otherLocations.map((loc: any) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.locationOption,
                        toLocationId === loc.id && styles.locationSelected,
                      ]}
                      onPress={() => setToLocationId(loc.id)}
                    >
                      <View style={styles.locationInfo}>
                        <Text style={[
                          styles.locationName,
                          toLocationId === loc.id && styles.locationNameSelected,
                        ]}>
                          {loc.name}
                        </Text>
                        <Text style={styles.locationType}>{loc.type}</Text>
                      </View>
                      {toLocationId === loc.id && (
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            {/* Quantity */}
            <Card>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <Input
                label={unit === 'bag' ? 'Number of bags' : 'Kilograms'}
                placeholder={unit === 'bag' ? 'e.g. 5' : 'e.g. 50'}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                error={quantity !== '' && qty <= 0 ? 'Must be greater than 0' : undefined}
              />
              {qty > 0 && (
                <Text style={styles.kgHint}>= {displayKg} kg</Text>
              )}
            </Card>

            {/* Unit toggle */}
            <Card>
              <Text style={styles.sectionTitle}>Unit</Text>
              <View style={styles.unitRow}>
                <TouchableOpacity
                  style={[styles.unitOption, unit === 'bag' && styles.unitSelected]}
                  onPress={() => setUnit('bag')}
                >
                  <Ionicons name="cube-outline" size={20} color={unit === 'bag' ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.unitLabel, unit === 'bag' && styles.unitLabelSelected]}>Bags</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitOption, unit === 'kg' && styles.unitSelected]}
                  onPress={() => setUnit('kg')}
                >
                  <Ionicons name="scale-outline" size={20} color={unit === 'kg' ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.unitLabel, unit === 'kg' && styles.unitLabelSelected]}>Kilograms</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Notes */}
            <Card>
              <Input
                label="Notes (optional)"
                placeholder="Reason for transfer..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
            </Card>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={mutation.isPending ? 'Transferring...' : 'Transfer Stock'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={!isValid || mutation.isPending}
              style={{ backgroundColor: brand.accent }}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  infoBanner: { borderLeftWidth: 3, borderLeftColor: colors.info },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.gray[600], lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readOnlyText: { fontSize: fontSize.md, color: colors.gray[700], fontWeight: fontWeight.medium },
  locationList: { gap: spacing.sm },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  locationSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  locationInfo: { flex: 1 },
  locationName: { fontSize: fontSize.sm, fontWeight: '600', color: '#334155' },
  locationNameSelected: { color: '#fff' },
  locationType: { fontSize: fontSize.xs, color: '#94a3b8', marginTop: 2 },
  emptyText: { fontSize: fontSize.sm, color: colors.gray[400] },
  kgHint: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: spacing.xs },
  unitRow: { flexDirection: 'row', gap: spacing.md },
  unitOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  unitSelected: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  unitLabel: { fontSize: fontSize.sm, fontWeight: '600', color: '#64748b' },
  unitLabelSelected: { color: '#fff' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
});
