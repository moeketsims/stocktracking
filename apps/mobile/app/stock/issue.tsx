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
import { useIssueStock } from '../../src/hooks/useStock';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

type Unit = 'bag' | 'kg';

export default function IssueStockScreen() {
  const router = useRouter();
  const mutation = useIssueStock();

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('bag');
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0;
  const displayKg = unit === 'bag' ? qty * 10 : qty;

  const handleSubmit = () => {
    if (!isValid) return;

    const label = unit === 'bag' ? `${qty} bag${qty > 1 ? 's' : ''}` : `${qty} kg`;
    Alert.alert('Issue Stock', `Issue ${label} from your location?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Issue',
        onPress: () => {
          mutation.mutate(
            { quantity: qty, unit, notes: notes.trim() || undefined },
            {
              onSuccess: (data) => {
                Alert.alert('Success', data.message ?? 'Stock issued successfully.', [
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
          title: 'Issue Stock',
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
            <Card style={styles.infoBanner}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  Issue stock from your location. This deducts from the oldest batch first (FIFO).
                </Text>
              </View>
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
                <Text style={styles.kgHint}>
                  = {displayKg} kg
                </Text>
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
                  <Ionicons name="cube-outline" size={20} color={unit === 'bag' ? colors.primary[600] : colors.gray[400]} />
                  <Text style={[styles.unitLabel, unit === 'bag' && styles.unitLabelSelected]}>Bags</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitOption, unit === 'kg' && styles.unitSelected]}
                  onPress={() => setUnit('kg')}
                >
                  <Ionicons name="scale-outline" size={20} color={unit === 'kg' ? colors.primary[600] : colors.gray[400]} />
                  <Text style={[styles.unitLabel, unit === 'kg' && styles.unitLabelSelected]}>Kilograms</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Notes */}
            <Card>
              <Input
                label="Notes (optional)"
                placeholder="Reason for issuing stock..."
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
              title={mutation.isPending ? 'Issuing...' : 'Issue Stock'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={!isValid || mutation.isPending}
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
  infoBanner: { borderLeftWidth: 3, borderLeftColor: colors.info },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.gray[600], lineHeight: 20 },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  kgHint: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: spacing.xs },
  unitRow: { flexDirection: 'row', gap: spacing.md },
  unitOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  unitSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  unitLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  unitLabelSelected: { color: colors.primary[600] },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
});
