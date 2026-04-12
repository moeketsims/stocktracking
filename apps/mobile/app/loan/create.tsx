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
import { useCreateLoan, useLoanLocations } from '../../src/hooks/useLoans';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/constants/theme';

export default function CreateLoanScreen() {
  const router = useRouter();
  const mutation = useCreateLoan();
  const { data: locationsData, isLoading: locationsLoading } = useLoanLocations();

  const locations = locationsData?.locations ?? [];

  const [lenderLocationId, setLenderLocationId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [returnDays, setReturnDays] = useState('7');
  const [notes, setNotes] = useState('');

  const qty = Number(quantity);
  const isValid = qty > 0 && lenderLocationId !== '';
  const selectedLocation = locations.find((l) => l.id === lenderLocationId);

  const handleSubmit = () => {
    if (!isValid) return;

    const days = Number(returnDays) || 7;
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + days);

    Alert.alert(
      'Request Loan',
      `Borrow ${qty} bag${qty > 1 ? 's' : ''} from ${selectedLocation?.name ?? 'selected location'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            mutation.mutate(
              {
                lender_location_id: lenderLocationId,
                quantity_requested: qty,
                estimated_return_date: returnDate.toISOString().split('T')[0],
                notes: notes.trim() || undefined,
              },
              { onSuccess: () => router.back() },
            );
          },
        },
      ],
    );
  };

  if (locationsLoading) {
    return <Loading fullScreen message="Loading locations..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Request Loan',
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
                  Request to borrow stock from another location. The lender must approve before stock is dispatched.
                </Text>
              </View>
            </Card>

            {/* Lender location */}
            <Card>
              <Text style={styles.sectionTitle}>Borrow From</Text>
              {locations.length === 0 ? (
                <Text style={styles.emptyText}>No locations available to borrow from</Text>
              ) : (
                <View style={styles.locationList}>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.locationOption,
                        lenderLocationId === loc.id && styles.locationSelected,
                      ]}
                      onPress={() => setLenderLocationId(loc.id)}
                    >
                      <View style={styles.locationInfo}>
                        <Text style={[
                          styles.locationName,
                          lenderLocationId === loc.id && styles.locationNameSelected,
                        ]}>
                          {loc.name}
                        </Text>
                        <Text style={styles.locationStock}>
                          {loc.current_stock_bags} bags available
                        </Text>
                      </View>
                      {lenderLocationId === loc.id && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary[500]} />
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
                label="Number of bags"
                placeholder="e.g. 5"
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
                error={quantity !== '' && qty <= 0 ? 'Must be greater than 0' : undefined}
              />
              {qty > 0 && (
                <Text style={styles.kgHint}>= {qty * 10} kg</Text>
              )}
            </Card>

            {/* Return days */}
            <Card>
              <Text style={styles.sectionTitle}>Return Period</Text>
              <Input
                label="Days until return"
                placeholder="e.g. 7"
                keyboardType="number-pad"
                value={returnDays}
                onChangeText={setReturnDays}
              />
              {Number(returnDays) > 0 && (
                <Text style={styles.kgHint}>
                  Return by: {new Date(Date.now() + Number(returnDays) * 86400000).toLocaleDateString()}
                </Text>
              )}
            </Card>

            {/* Notes */}
            <Card>
              <Input
                label="Notes (optional)"
                placeholder="Reason for borrowing..."
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
              title={mutation.isPending ? 'Requesting...' : 'Request Loan'}
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
  locationList: { gap: spacing.sm },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  locationSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  locationInfo: { flex: 1 },
  locationName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[700] },
  locationNameSelected: { color: colors.primary[700] },
  locationStock: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
  emptyText: { fontSize: fontSize.sm, color: colors.gray[400] },
  kgHint: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: spacing.xs },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
});
