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
import { useCreateAdjustment, useAdjustmentReasons, useBatches } from '../../src/hooks/useStock';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

const AMBER = '#f59e0b';
const AMBER_BG = '#fffbeb';
const AMBER_BORDER = '#fcd34d';

type Direction = 'positive' | 'negative';

export default function AdjustmentScreen() {
  const router = useRouter();
  const mutation = useCreateAdjustment();
  const reasonsQuery = useAdjustmentReasons();
  const batchesQuery = useBatches();

  const [direction, setDirection] = useState<Direction>('positive');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'bag' | 'kg'>('bag');
  const [reason, setReason] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const reasons = reasonsQuery.data?.reasons ?? [];
  const batches = batchesQuery.data?.batches ?? [];

  // We need an item_id for the adjustment. Use the first available batch's item_id or first item
  const defaultItemId = batches.length > 0 ? batches[0].item_id : '';

  const isValid = Number(quantity) > 0 && reason !== null && defaultItemId !== '';

  const handleSubmit = () => {
    if (!isValid || !reason) return;

    const qty = Number(quantity);
    const signedQty = direction === 'negative' ? -qty : qty;
    const displayQty = unit === 'bag' ? `${qty} bag${qty > 1 ? 's' : ''}` : `${qty} kg`;
    const sign = direction === 'positive' ? '+' : '-';
    const reasonLabel = reasons.find((r) => r.value === reason)?.label ?? reason;

    Alert.alert(
      'Confirm Adjustment',
      `${sign}${displayQty} (${reasonLabel})?\n\nThis will update stock levels.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            mutation.mutate(
              {
                item_id: defaultItemId,
                quantity: signedQty,
                unit,
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
    return <Loading fullScreen message="Loading..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Stock Adjustment',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Direction */}
            <Card style={{ borderLeftWidth: 3, borderLeftColor: AMBER }}>
              <Text style={styles.sectionTitle}>Adjustment Type</Text>
              <View style={styles.dirRow}>
                <TouchableOpacity
                  style={[
                    styles.dirOption,
                    direction === 'positive' && { borderColor: colors.success, backgroundColor: '#dcfce7' },
                  ]}
                  onPress={() => setDirection('positive')}
                >
                  <Ionicons name="add-circle" size={24} color={direction === 'positive' ? colors.success : colors.gray[400]} />
                  <Text style={[styles.dirLabel, direction === 'positive' && { color: colors.success }]}>
                    Add Stock
                  </Text>
                  <Text style={styles.dirHint}>Found stock, correction up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dirOption,
                    direction === 'negative' && { borderColor: colors.error, backgroundColor: '#fee2e2' },
                  ]}
                  onPress={() => setDirection('negative')}
                >
                  <Ionicons name="remove-circle" size={24} color={direction === 'negative' ? colors.error : colors.gray[400]} />
                  <Text style={[styles.dirLabel, direction === 'negative' && { color: colors.error }]}>
                    Remove Stock
                  </Text>
                  <Text style={styles.dirHint}>Theft, count error</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Quantity */}
            <Card>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.qtyRow}>
                <View style={styles.qtyInput}>
                  <Input
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                    error={quantity !== '' && Number(quantity) <= 0 ? 'Must be > 0' : undefined}
                  />
                </View>
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[styles.unitBtn, unit === 'bag' && styles.unitBtnActive]}
                    onPress={() => setUnit('bag')}
                  >
                    <Text style={[styles.unitText, unit === 'bag' && styles.unitTextActive]}>Bags</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}
                    onPress={() => setUnit('kg')}
                  >
                    <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

            {/* Reason */}
            <Card>
              <Text style={styles.sectionTitle}>Reason</Text>
              <View style={styles.reasonGrid}>
                {reasons.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.reasonChip,
                      reason === r.value && styles.reasonChipSelected,
                    ]}
                    onPress={() => setReason(r.value)}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        reason === r.value && styles.reasonTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Batch selection (optional) */}
            {batches.length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>Batch (optional)</Text>
                <Text style={styles.batchHint}>Select a specific batch to adjust, or leave empty for general adjustment.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.batchScroll}>
                  <TouchableOpacity
                    style={[styles.batchChip, selectedBatch === null && styles.batchChipSelected]}
                    onPress={() => setSelectedBatch(null)}
                  >
                    <Text style={[styles.batchChipText, selectedBatch === null && styles.batchChipTextSelected]}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {batches.slice(0, 10).map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.batchChip, selectedBatch === b.id && styles.batchChipSelected]}
                      onPress={() => setSelectedBatch(b.id)}
                    >
                      <Text style={[styles.batchChipText, selectedBatch === b.id && styles.batchChipTextSelected]}>
                        #{b.batch_id_display} ({b.remaining_qty.toFixed(0)} kg)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <Input
                label="Notes (optional)"
                placeholder="Explain the adjustment..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
            </Card>
          </ScrollView>

          {/* Submit */}
          <View style={styles.footer}>
            <Button
              title={mutation.isPending ? 'Saving...' : 'Record Adjustment'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={!isValid || mutation.isPending}
              style={{ backgroundColor: AMBER }}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  dirRow: { flexDirection: 'row', gap: spacing.md },
  dirOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  dirLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
  },
  dirHint: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    textAlign: 'center',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  qtyInput: { flex: 1 },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    overflow: 'hidden',
    marginTop: 2,
  },
  unitBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  unitBtnActive: {
    backgroundColor: AMBER,
  },
  unitText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  unitTextActive: { color: colors.white },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: AMBER,
    backgroundColor: AMBER_BG,
  },
  reasonChipSelected: {
    backgroundColor: AMBER,
    borderColor: AMBER,
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: AMBER,
  },
  reasonTextSelected: { color: colors.white },
  batchHint: { fontSize: fontSize.xs, color: colors.gray[500], marginBottom: spacing.sm },
  batchScroll: { marginTop: spacing.xs },
  batchChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  batchChipSelected: {
    backgroundColor: AMBER,
    borderColor: AMBER,
  },
  batchChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  batchChipTextSelected: { color: colors.white },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
});
