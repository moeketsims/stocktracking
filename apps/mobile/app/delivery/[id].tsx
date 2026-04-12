import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { useCompleteStop } from '../../src/hooks/useTrips';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

type Mode = 'choose' | 'scan' | 'manual' | 'confirm';

export default function DeliveryScanScreen() {
  const { id: stopId, tripId, planned, locationName } = useLocalSearchParams<{
    id: string;
    tripId: string;
    planned: string;
    locationName: string;
  }>();
  const router = useRouter();
  const completeStop = useCompleteStop();

  const plannedKg = parseFloat(planned ?? '0');
  const expectedBags = Math.round(plannedKg / 10);

  const [mode, setMode] = useState<Mode>('choose');
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [manualBags, setManualBags] = useState('');
  const [notes, setNotes] = useState('');

  const handleScanComplete = (barcodes: string[]) => {
    setScannedBarcodes(barcodes);
    setMode('confirm');
  };

  const handleManualSubmit = () => {
    const bags = parseInt(manualBags, 10);
    if (isNaN(bags) || bags <= 0) return;
    setMode('confirm');
  };

  const handleConfirmDelivery = () => {
    const isScanned = scannedBarcodes.length > 0;
    const bags = isScanned ? scannedBarcodes.length : parseInt(manualBags, 10);

    Alert.alert(
      'Confirm Delivery',
      `Complete stop with ${bags} bags${isScanned ? ` (${bags} scanned)` : ' (manual entry)'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            completeStop.mutate(
              {
                stopId,
                data: {
                  actual_bags: bags,
                  actual_qty_kg: bags * 10,
                  notes: notes || undefined,
                  scanned_barcodes: isScanned ? scannedBarcodes : undefined,
                },
              },
              {
                onSuccess: () => {
                  router.back();
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `Deliver to ${decodeURIComponent(locationName ?? 'Location')}`,
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {mode === 'choose' && (
          <View style={styles.chooseContainer}>
            <Card>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color={colors.primary[500]} />
                <Text style={styles.locationName}>{decodeURIComponent(locationName ?? '')}</Text>
              </View>
              <Text style={styles.expectedText}>
                Expected: {expectedBags} bags ({plannedKg} kg)
              </Text>
            </Card>

            <View style={styles.chooseActions}>
              <Button
                title="Scan Barcodes"
                onPress={() => setMode('scan')}
                size="lg"
                icon={<Ionicons name="barcode" size={20} color={colors.white} />}
              />
              <Button
                title="Manual Entry"
                onPress={() => setMode('manual')}
                variant="outline"
                size="lg"
                icon={<Ionicons name="keypad" size={20} color={colors.primary[500]} />}
              />
            </View>
          </View>
        )}

        {mode === 'scan' && (
          <BarcodeScanner
            onScanComplete={handleScanComplete}
            expectedCount={expectedBags}
          />
        )}

        {mode === 'manual' && (
          <View style={styles.manualContainer}>
            <Card>
              <Text style={styles.sectionTitle}>Manual Bag Entry</Text>
              <Text style={styles.expectedText}>
                Expected: {expectedBags} bags
              </Text>
              <Input
                label="Actual bags delivered"
                placeholder="Enter number of bags"
                value={manualBags}
                onChangeText={setManualBags}
                keyboardType="numeric"
              />
              <Input
                label="Notes (optional)"
                placeholder="Any notes about the delivery"
                value={notes}
                onChangeText={setNotes}
                multiline
                containerStyle={{ marginTop: spacing.md }}
              />
              <View style={styles.manualActions}>
                <Button
                  title="Back"
                  variant="ghost"
                  onPress={() => setMode('choose')}
                />
                <Button
                  title="Next"
                  onPress={handleManualSubmit}
                  disabled={!manualBags || parseInt(manualBags, 10) <= 0}
                />
              </View>
            </Card>
          </View>
        )}

        {mode === 'confirm' && (
          <View style={styles.confirmContainer}>
            <Card>
              <Text style={styles.sectionTitle}>Confirm Delivery</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location</Text>
                <Text style={styles.summaryValue}>{decodeURIComponent(locationName ?? '')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Expected</Text>
                <Text style={styles.summaryValue}>{expectedBags} bags</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Actual</Text>
                <Text style={[styles.summaryValue, styles.actualValue]}>
                  {scannedBarcodes.length > 0
                    ? `${scannedBarcodes.length} bags (scanned)`
                    : `${manualBags} bags (manual)`}
                </Text>
              </View>
              {scannedBarcodes.length > 0 && scannedBarcodes.length !== expectedBags && (
                <View style={styles.discrepancyBanner}>
                  <Ionicons name="warning" size={16} color="#854d0e" />
                  <Text style={styles.discrepancyText}>
                    Discrepancy: {scannedBarcodes.length - expectedBags > 0 ? '+' : ''}
                    {scannedBarcodes.length - expectedBags} bags
                  </Text>
                </View>
              )}
              <Input
                label="Notes (optional)"
                placeholder="Any notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                containerStyle={{ marginTop: spacing.md }}
              />
            </Card>
            <View style={styles.confirmActions}>
              <Button
                title="Back"
                variant="outline"
                onPress={() =>
                  scannedBarcodes.length > 0
                    ? setMode('scan')
                    : setMode('manual')
                }
              />
              <Button
                title="Confirm Delivery"
                onPress={handleConfirmDelivery}
                loading={completeStop.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  chooseContainer: { flex: 1, padding: spacing.lg, gap: spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  locationName: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  expectedText: { fontSize: fontSize.sm, color: colors.gray[500] },
  chooseActions: { gap: spacing.md },
  manualContainer: { flex: 1, padding: spacing.lg },
  manualActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  confirmContainer: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.gray[900], marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  summaryLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  summaryValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[900] },
  actualValue: { fontWeight: fontWeight.bold, color: colors.primary[600] },
  discrepancyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fef9c3',
    borderRadius: 8,
  },
  discrepancyText: { fontSize: fontSize.sm, color: '#854d0e' },
  confirmActions: { flexDirection: 'row', gap: spacing.md },
});
