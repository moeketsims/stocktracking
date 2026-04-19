import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCreateAdjustment, useAdjustmentReasons, useBatches } from '../../src/hooks/useStock';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  DFieldBox,
  PrimaryBar,
  MonoText,
  QuantityField,
} from '../../src/components/wp';
import { wp, fmtKickerDate } from '../../src/constants/warehousePaper';

type Direction = 'positive' | 'negative';

export default function AdjustmentScreen() {
  const router = useRouter();
  const mutation = useCreateAdjustment();
  const reasonsQuery = useAdjustmentReasons();
  const batchesQuery = useBatches();

  const [direction, setDirection] = useState<Direction>('positive');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const reasons = reasonsQuery.data?.reasons ?? [];
  const batches = batchesQuery.data?.batches ?? [];
  const defaultItemId = batches.length > 0 ? batches[0].item_id : '';
  const qty = Number(quantity);
  const isValid = qty > 0 && reason !== null && defaultItemId !== '';

  const handleSubmit = () => {
    if (!isValid || !reason) return;
    const signedQty = direction === 'negative' ? -qty : qty;
    const sign = direction === 'positive' ? '+' : '−';
    const reasonLabel = reasons.find((r) => r.value === reason)?.label ?? reason;
    Alert.alert(
      'Confirm Adjustment',
      `${sign}${qty} bag${qty > 1 ? 's' : ''} (${reasonLabel})?\n\nThis will update stock levels.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            mutation.mutate(
              {
                item_id: defaultItemId,
                quantity: signedQty,
                unit: 'bag',
                reason: reason as any,
                batch_id: selectedBatch ?? undefined,
                notes: notes.trim() || undefined,
              },
              {
                onSuccess: (data) => {
                  Alert.alert('Adjustment Recorded', data.message, [
                    { text: 'OK', onPress: () => router.back() },
                  ]);
                },
              },
            );
          },
        },
      ],
    );
  };

  if (reasonsQuery.isLoading || batchesQuery.isLoading) {
    return <Loading fullScreen message="" />;
  }

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <Masthead
            kicker={`ADJUSTMENT — ${fmtKickerDate()}`}
            title="Reconcile stock"
            backUseRouter
          />

          <ScrollView contentContainerStyle={styles.content}>
            <IntentStrip>
              Correct a mismatch between counted and recorded stock. Creates an audit trail.
            </IntentStrip>

            {/* Direction — two tiles */}
            <DFieldBox label="Adjustment">
              <View style={styles.dirRow}>
                <DirTile
                  label="Add stock"
                  sub="Found / returned"
                  selected={direction === 'positive'}
                  onPress={() => setDirection('positive')}
                />
                <DirTile
                  label="Remove"
                  labelColor={wp.color.red}
                  sub="Count error / loss"
                  selected={direction === 'negative'}
                  onPress={() => setDirection('negative')}
                />
              </View>
            </DFieldBox>

            {/* Quantity */}
            <DFieldBox label="Quantity · bags">
              <QuantityField
                value={quantity}
                onChangeText={setQuantity}
                prefix={direction === 'negative' ? '−' : '+'}
                color={direction === 'negative' ? wp.color.red : wp.color.ink}
              />
              <View style={styles.qtyUnderline} />
              <MonoText size={9} tracking={1.5} upper color={wp.color.ink3} style={{ marginTop: 6 }}>
                Tap to type
              </MonoText>
            </DFieldBox>

            {/* Reason — stamp chips */}
            <DFieldBox label="Reason">
              <View style={styles.reasonGrid}>
                {reasons.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      activeOpacity={0.65}
                      onPress={() => setReason(r.value)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </DFieldBox>

            {/* Batch (optional) */}
            {batches.length > 0 && (
              <DFieldBox label="Batch · optional">
                <View style={styles.reasonGrid}>
                  <TouchableOpacity
                    activeOpacity={0.65}
                    onPress={() => setSelectedBatch(null)}
                    style={[styles.chip, !selectedBatch && styles.chipSelected]}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[styles.chipLabel, !selectedBatch && styles.chipLabelSelected]}
                    >
                      Any
                    </Text>
                  </TouchableOpacity>
                  {batches.slice(0, 6).map((b) => {
                    const selected = selectedBatch === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        activeOpacity={0.65}
                        onPress={() => setSelectedBatch(b.id)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          allowFontScaling={false}
                          style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                        >
                          {b.batch_id_display}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </DFieldBox>
            )}

            {/* Notes */}
            <DFieldBox label="Notes · optional" noDivider>
              <View style={styles.notesBox}>
                <TextInput
                  placeholder="Evidence, context, or witness…"
                  placeholderTextColor={wp.color.ink3}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  style={styles.notesInput}
                />
              </View>
            </DFieldBox>
          </ScrollView>
        </KeyboardAvoidingView>

        <PrimaryBar
          label="Record adjustment"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={mutation.isPending}
        />
      </SafeAreaView>
    </PaperBackground>
  );
}

function DirTile({
  label,
  labelColor = wp.color.ink,
  sub,
  selected,
  onPress,
}: {
  label: string;
  labelColor?: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.tileWrap}>
      {selected && <View pointerEvents="none" style={styles.tileShadow} />}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.tile, selected && styles.tileSelected]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.tileTitle,
            { color: selected ? wp.color.paper : labelColor },
          ]}
        >
          {label}
        </Text>
        <MonoText
          size={9}
          tracking={1.5}
          upper
          color={selected ? wp.color.paper : wp.color.ink3}
          weight={500}
          style={{ marginTop: 2 }}
        >
          {sub}
        </MonoText>
      </TouchableOpacity>
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

  // Direction tiles
  dirRow: { flexDirection: 'row', gap: 10 },
  tileWrap: { flex: 1, position: 'relative' },
  tileShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: wp.color.lineD,
  },
  tile: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tileSelected: {
    borderWidth: 2,
    backgroundColor: wp.color.ink,
  },
  tileTitle: {
    fontFamily: wp.font.serifBold.fontFamily,
    fontWeight: wp.font.serifBold.fontWeight,
    fontStyle: 'italic',
    fontSize: 20,
    letterSpacing: -0.5,
  },

  // Quantity
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
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },

  // Reason / batch chips
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: wp.color.lineD,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: wp.color.ink,
  },
  chipLabel: {
    fontFamily: wp.font.monoSemi.fontFamily,
    fontWeight: wp.font.monoSemi.fontWeight,
    fontSize: 11,
    letterSpacing: 1,
    color: wp.color.ink,
    textTransform: 'uppercase',
  },
  chipLabelSelected: {
    color: wp.color.paper,
  },

  // Notes
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
