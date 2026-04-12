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
import { useLogWaste } from '../../src/hooks/useStock';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';
import type { WasteReason } from '../../src/types';

const WASTE_REASONS: Array<{ value: WasteReason; label: string; icon: string }> = [
  { value: 'spoiled', label: 'Spoiled', icon: 'alert-circle' },
  { value: 'damaged', label: 'Damaged', icon: 'hammer' },
  { value: 'trim_prep_loss', label: 'Trim / Prep Loss', icon: 'cut' },
  { value: 'contaminated', label: 'Contaminated', icon: 'warning' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function WasteScreen() {
  const router = useRouter();
  const mutation = useLogWaste();

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'bag' | 'kg'>('bag');
  const [reason, setReason] = useState<WasteReason | null>(null);
  const [notes, setNotes] = useState('');

  const isValid = Number(quantity) > 0 && reason !== null;

  const handleSubmit = () => {
    if (!isValid || !reason) return;

    const qty = Number(quantity);
    const displayQty = unit === 'bag' ? `${qty} bag${qty > 1 ? 's' : ''}` : `${qty} kg`;

    Alert.alert('Confirm Waste', `Log ${displayQty} as waste (${reason.replace(/_/g, ' ')})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Waste',
        style: 'destructive',
        onPress: () => {
          mutation.mutate(
            {
              quantity: qty,
              unit,
              reason,
              notes: notes.trim() || undefined,
            },
            {
              onSuccess: (data) => {
                Alert.alert('Waste Logged', data.message ?? 'Waste has been recorded.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              },
            },
          );
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Log Waste',
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
                {WASTE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.reasonChip,
                      reason === r.value && styles.reasonChipSelected,
                    ]}
                    onPress={() => setReason(r.value)}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={16}
                      color={reason === r.value ? colors.white : colors.error}
                    />
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

            {/* Notes */}
            <Card>
              <Input
                label="Notes (optional)"
                placeholder="Describe the waste..."
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
              title={mutation.isPending ? 'Logging...' : 'Log Waste'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={!isValid || mutation.isPending}
              variant="danger"
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
    backgroundColor: colors.error,
  },
  unitText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[600],
  },
  unitTextActive: { color: colors.white },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: '#fee2e2',
  },
  reasonChipSelected: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  reasonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  reasonTextSelected: { color: colors.white },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
});
