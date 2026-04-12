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
import { brand, colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

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
            {/* Direction */}
            <Card style={{ borderLeftWidth: 3, borderLeftColor: AMBER }}>
              <Text style={styles.sectionTitle}>Adjustment Type</Text>
              <View style={styles.dirRow}>
                <TouchableOpacity
                  style={[
                    styles.dirOption,
                    direction === 'positive' && { borderColor: '#0f172a', backgroundColor: '#0f172a' },
                  ]}
                  onPress={() => setDirection('positive')}
                >
                  <Ionicons name="add-circle" size={24} color={direction === 'positive' ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.dirLabel, direction === 'positive' && { color: '#fff' }]}>
                    Add Stock
                  </Text>
                  <Text style={[styles.dirHint, direction === 'positive' && { color: 'rgba(255,255,255,0.5)' }]}>Found stock, correction up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dirOption,
                    direction === 'negative' && { borderColor: '#0f172a', backgroundColor: '#0f172a' },
                  ]}
                  onPress={() => setDirection('negative')}
                >
                  <Ionicons name="remove-circle" size={24} color={direction === 'negative' ? '#fff' : '#94a3b8'} />
                  <Text style={[styles.dirLabel, direction === 'negative' && { color: '#fff' }]}>
                    Remove Stock
                  </Text>
                  <Text style={[styles.dirHint, direction === 'negative' && { color: 'rgba(255,255,255,0.5)' }]}>Theft, count error</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  dirRow: { flexDirection: 'row', gap: spacing.md },
  dirOption: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 2,
  },
  unitBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
  },
  unitBtnActive: {
    backgroundColor: '#0f172a',
  },
  unitText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#64748b',
  },
  unitTextActive: { color: '#fff' },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  reasonChipSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#64748b',
  },
  reasonTextSelected: { color: '#fff' },
  batchHint: { fontSize: fontSize.xs, color: colors.gray[500], marginBottom: spacing.sm },
  batchScroll: { marginTop: spacing.xs },
  batchChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginRight: spacing.sm,
  },
  batchChipSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  batchChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#64748b',
  },
  batchChipTextSelected: { color: '#fff' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
});
