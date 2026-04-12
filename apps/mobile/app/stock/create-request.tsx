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
import { useCreateStockRequest } from '../../src/hooks/useStock';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

type Urgency = 'normal' | 'urgent';

export default function CreateRequestScreen() {
  const router = useRouter();
  const mutation = useCreateStockRequest();

  const [quantityBags, setQuantityBags] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [notes, setNotes] = useState('');

  const isValid = Number(quantityBags) > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const qty = Number(quantityBags);
    const confirmMsg = `Request ${qty} bag${qty > 1 ? 's' : ''} (${urgency})?\n\nThis will notify available drivers.`;

    Alert.alert('Confirm Request', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Create Request',
        onPress: () => {
          mutation.mutate(
            {
              quantity_bags: qty,
              urgency,
              notes: notes.trim() || undefined,
            },
            {
              onSuccess: (data) => {
                Alert.alert('Request Created', data.message ?? 'Your stock request has been submitted.', [
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
          title: 'Create Stock Request',
          headerStyle: { backgroundColor: colors.info },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Info banner */}
            <Card style={styles.infoBanner}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.infoText}>
                  Create a replenishment request. Drivers will be notified and can accept the delivery.
                </Text>
              </View>
            </Card>

            {/* Quantity */}
            <Card>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <Input
                label="Number of bags"
                placeholder="e.g. 10"
                keyboardType="number-pad"
                value={quantityBags}
                onChangeText={setQuantityBags}
                error={quantityBags !== '' && Number(quantityBags) <= 0 ? 'Must be greater than 0' : undefined}
              />
              {Number(quantityBags) > 0 && (
                <Text style={styles.kgHint}>
                  = {Number(quantityBags) * 10} kg
                </Text>
              )}
            </Card>

            {/* Urgency */}
            <Card>
              <Text style={styles.sectionTitle}>Urgency</Text>
              <View style={styles.urgencyRow}>
                <TouchableOpacity
                  style={[
                    styles.urgencyOption,
                    urgency === 'normal' && styles.urgencySelected,
                  ]}
                  onPress={() => setUrgency('normal')}
                >
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={urgency === 'normal' ? colors.info : colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.urgencyLabel,
                      urgency === 'normal' && styles.urgencyLabelSelected,
                    ]}
                  >
                    Normal
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.urgencyOption,
                    urgency === 'urgent' && styles.urgencyUrgentSelected,
                  ]}
                  onPress={() => setUrgency('urgent')}
                >
                  <Ionicons
                    name="flash"
                    size={20}
                    color={urgency === 'urgent' ? colors.error : colors.gray[400]}
                  />
                  <Text
                    style={[
                      styles.urgencyLabel,
                      urgency === 'urgent' && styles.urgencyUrgentLabel,
                    ]}
                  >
                    Urgent
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Notes */}
            <Card>
              <Input
                label="Notes (optional)"
                placeholder="Any additional details..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
            </Card>
          </ScrollView>

          {/* Submit button */}
          <View style={styles.footer}>
            <Button
              title={mutation.isPending ? 'Creating...' : 'Create Request'}
              onPress={handleSubmit}
              loading={mutation.isPending}
              disabled={!isValid || mutation.isPending}
              style={styles.submitButton}
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
  urgencyRow: { flexDirection: 'row', gap: spacing.md },
  urgencyOption: {
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
  urgencySelected: {
    borderColor: colors.info,
    backgroundColor: '#dbeafe',
  },
  urgencyUrgentSelected: {
    borderColor: colors.error,
    backgroundColor: '#fee2e2',
  },
  urgencyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  urgencyLabelSelected: { color: colors.info },
  urgencyUrgentLabel: { color: colors.error },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  submitButton: { backgroundColor: colors.info },
});
