import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { useCompleteStop } from '../../src/hooks/useTrips';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  DFieldBox,
  PrimaryBar,
  MonoText,
  KickerLabel,
  Stamp,
  SerifNumber,
  HardShadowFrame,
  InkButton,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

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
  const decodedLocation = decodeURIComponent(locationName ?? 'Location');

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
      `Complete stop with ${bags} bag${bags > 1 ? 's' : ''}${isScanned ? ` (${bags} scanned)` : ' (manual entry)'}?`,
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
              { onSuccess: () => router.back() },
            );
          },
        },
      ],
    );
  };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`DROPOFF — ${fmtKickerDate()}`}
            title={decodedLocation}
            backUseRouter
          />

          {mode === 'choose' && (
            <ChooseMode
              expectedBags={expectedBags}
              location={decodedLocation}
              onScan={() => setMode('scan')}
              onManual={() => setMode('manual')}
            />
          )}

          {mode === 'scan' && (
            <View style={styles.flex}>
              <BarcodeScanner
                onScanComplete={handleScanComplete}
                expectedCount={expectedBags}
              />
            </View>
          )}

          {mode === 'manual' && (
            <ManualMode
              expectedBags={expectedBags}
              manualBags={manualBags}
              setManualBags={setManualBags}
              notes={notes}
              setNotes={setNotes}
              onBack={() => setMode('choose')}
              onNext={handleManualSubmit}
            />
          )}

          {mode === 'confirm' && (
            <ConfirmMode
              expectedBags={expectedBags}
              scannedBarcodes={scannedBarcodes}
              manualBags={manualBags}
              notes={notes}
              setNotes={setNotes}
              onBack={() => (scannedBarcodes.length > 0 ? setMode('scan') : setMode('manual'))}
              onConfirm={handleConfirmDelivery}
              loading={completeStop.isPending}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function ChooseMode({
  expectedBags,
  location,
  onScan,
  onManual,
}: {
  expectedBags: number;
  location: string;
  onScan: () => void;
  onManual: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <IntentStrip>
        Scan the barcode on each bag, or tap manual entry if scanning isn't possible.
      </IntentStrip>

      <HardShadowFrame style={{ marginBottom: 18 }}>
        <View style={styles.voucher}>
          <View style={styles.voucherHead}>
            <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
              DROPOFF
            </KickerLabel>
            <Stamp color="amber" rotate={3}>EXPECTED</Stamp>
          </View>
          <View style={styles.heroRow}>
            <SerifNumber size={72} tracking={-2} leading={0.95} color={wp.color.ink} autoShrink>
              {String(expectedBags)}
            </SerifNumber>
            <View style={{ marginLeft: 10 }}>
              <MonoText size={11} tracking={1.5} color={wp.color.ink3}>BAGS</MonoText>
              <MonoText size={10} tracking={1} color={wp.color.ink3} style={{ marginTop: 2 }}>
                For {location}
              </MonoText>
            </View>
          </View>
        </View>
      </HardShadowFrame>

      <View style={styles.chooseActions}>
        <TouchableOpacity activeOpacity={0.85} onPress={onScan} style={styles.primaryAction}>
          <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.primaryActionLabel}>
            SCAN BARCODES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={onManual} style={styles.secondaryAction}>
          <Text maxFontSizeMultiplier={wp.fontScale.compact} style={styles.secondaryActionLabel}>
            MANUAL ENTRY
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ManualMode({
  expectedBags,
  manualBags,
  setManualBags,
  notes,
  setNotes,
  onBack,
  onNext,
}: {
  expectedBags: number;
  manualBags: string;
  setManualBags: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const qty = parseInt(manualBags, 10);
  const isValid = !isNaN(qty) && qty > 0;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <IntentStrip>
          Enter the count of bags you delivered. Note any discrepancy from the expected amount.
        </IntentStrip>

        <DFieldBox label={`Actual bags · expected ${expectedBags}`}>
          <View style={styles.qtyRow}>
            <SerifNumber
              size={56}
              tracking={-2}
              leading={1}
              color={qty > 0 ? wp.color.ink : wp.color.ink3}
              autoShrink
              style={{ flexShrink: 1 }}
            >
              {qty > 0 ? String(qty) : '—'}
            </SerifNumber>
            <TouchableOpacity
              onPress={() => setManualBags(String(expectedBags))}
              activeOpacity={0.6}
              style={[styles.chip, qty === expectedBags && styles.chipActive]}
            >
              <MonoText
                size={11}
                weight={600}
                tracking={1}
                color={qty === expectedBags ? wp.color.paper : wp.color.ink}
              >
                AS EXPECTED
              </MonoText>
            </TouchableOpacity>
          </View>
          <TextInput
            maxFontSizeMultiplier={wp.fontScale.text}
            value={manualBags}
            onChangeText={setManualBags}
            keyboardType="number-pad"
            style={styles.hiddenInput}
            maxLength={6}
          />
          <View style={styles.qtyUnderline} />
        </DFieldBox>

        <DFieldBox label="Notes · optional" noDivider>
          <View style={styles.notesBox}>
            <TextInput
              maxFontSizeMultiplier={wp.fontScale.text}
              placeholder="Any notes about the delivery…"
              placeholderTextColor={wp.color.ink3}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.notesInput}
            />
          </View>
        </DFieldBox>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <InkButton label="Back" onPress={onBack} />
        </View>
      </ScrollView>

      <PrimaryBar label="Continue" onPress={onNext} disabled={!isValid} />
    </>
  );
}

function ConfirmMode({
  expectedBags,
  scannedBarcodes,
  manualBags,
  notes,
  setNotes,
  onBack,
  onConfirm,
  loading,
}: {
  expectedBags: number;
  scannedBarcodes: string[];
  manualBags: string;
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const isScanned = scannedBarcodes.length > 0;
  const actualBags = isScanned ? scannedBarcodes.length : parseInt(manualBags, 10) || 0;
  const diff = actualBags - expectedBags;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <HardShadowFrame style={{ marginBottom: 14 }}>
          <View style={styles.voucher}>
            <View style={styles.voucherHead}>
              <KickerLabel size={10} tracking={1.5} color={wp.color.ink3}>
                {isScanned ? 'SCANNED' : 'MANUAL ENTRY'}
              </KickerLabel>
              <Stamp color={diff !== 0 ? 'amber' : 'green'} rotate={3}>
                {diff !== 0 ? 'DISCREPANCY' : 'MATCH'}
              </Stamp>
            </View>

            <View style={styles.metaLedger}>
              <MetaRow label="EXPECTED" value={`${expectedBags} bags`} />
              <MetaRow
                label={isScanned ? 'SCANNED' : 'COUNTED'}
                value={`${actualBags} bags`}
              />
              {diff !== 0 && (
                <MetaRow
                  label="VARIANCE"
                  value={`${diff > 0 ? '+' : ''}${diff} bags`}
                  valueColor={diff < 0 ? wp.color.red : wp.color.amber}
                  last
                />
              )}
            </View>
          </View>
        </HardShadowFrame>

        <DFieldBox label="Notes · optional" noDivider>
          <View style={styles.notesBox}>
            <TextInput
              maxFontSizeMultiplier={wp.fontScale.text}
              placeholder="Driver notes…"
              placeholderTextColor={wp.color.ink3}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.notesInput}
            />
          </View>
        </DFieldBox>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <InkButton label="Back" onPress={onBack} />
        </View>
      </ScrollView>

      <PrimaryBar
        label={`Confirm delivery · ${actualBags} bags`}
        onPress={onConfirm}
        loading={loading}
      />
    </>
  );
}

function MetaRow({
  label,
  value,
  valueColor = wp.color.ink,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowDivider]}>
      <MonoText size={10} tracking={1.3} upper color={wp.color.ink3}>
        {label}
      </MonoText>
      <MonoText size={14} weight={700} color={valueColor}>
        {value}
      </MonoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: 14,
    paddingBottom: 200,
  },

  // Voucher
  voucher: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    padding: 14,
  },
  voucherHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },

  metaLedger: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: wp.color.line,
    borderStyle: 'dashed',
    paddingTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },

  // Choose mode
  chooseActions: {
    gap: 10,
  },
  primaryAction: {
    backgroundColor: wp.color.ink,
    borderWidth: 2,
    borderColor: wp.color.lineD,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryActionLabel: {
    fontFamily: wp.font.monoBold.fontFamily,
    fontWeight: wp.font.monoBold.fontWeight,
    fontSize: 13,
    letterSpacing: 2,
    color: wp.color.paper,
  },
  secondaryAction: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryActionLabel: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 12,
    letterSpacing: 1.5,
    color: wp.color.ink,
  },

  // Quantity (manual)
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyUnderline: {
    height: 1.5,
    backgroundColor: wp.color.lineD,
    marginTop: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: wp.color.ink,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },

  notesBox: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 12,
    minHeight: 72,
  },
  notesInput: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontStyle: 'italic',
    fontSize: 14,
    color: wp.color.ink,
    minHeight: 48,
    textAlignVertical: 'top',
    padding: 0,
  },
});
