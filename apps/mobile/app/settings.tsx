import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/stores/authStore';
import { useLogout } from '../src/hooks/useAuth';
import { useLocations, useLocationThresholds, useUpdateThresholds } from '../src/hooks/useLocations';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../src/constants/theme';
import { APP_VERSION } from '../src/constants/config';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const logout = useLogout();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Profile card */}
          <Card>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Row label="Name" value={user?.full_name ?? '\u2014'} />
            <Row label="Email" value={user?.email ?? '\u2014'} />
            <Row
              label="Role"
              value={
                user?.role
                  ?.replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase()) ?? '\u2014'
              }
            />
            <Row label="Location" value={user?.location_name ?? 'All locations'} />
            <Row label="Zone" value={user?.zone_name ?? '\u2014'} />
          </Card>

          {/* Stock Thresholds -- admin only */}
          {isAdmin() && <ThresholdsSection />}

          {/* App info */}
          <Card>
            <Text style={styles.sectionTitle}>App</Text>
            <Row label="Version" value={APP_VERSION} />
          </Card>

          <Button
            title="Sign Out"
            onPress={() => logout.mutate()}
            variant="danger"
            loading={logout.isPending}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Stock Thresholds Section (admin only) ───────────────────────────

function ThresholdsSection() {
  const { data: locationsData, isLoading: locationsLoading } = useLocations();
  const locations = locationsData?.locations ?? [];

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState('');
  const [lowThreshold, setLowThreshold] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: thresholdsData, isLoading: thresholdsLoading } = useLocationThresholds(
    selectedLocationId,
  );
  const updateMutation = useUpdateThresholds();

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  // Populate inputs when thresholds load
  useEffect(() => {
    if (thresholdsData) {
      setCriticalThreshold(thresholdsData.critical_stock_threshold?.toString() ?? '');
      setLowThreshold(thresholdsData.low_stock_threshold?.toString() ?? '');
    }
  }, [thresholdsData]);

  // Reset when location changes
  useEffect(() => {
    if (selectedLocationId && !thresholdsData) {
      setCriticalThreshold('');
      setLowThreshold('');
    }
    setError('');
    setSuccessMessage('');
  }, [selectedLocationId]);

  const handleSave = async () => {
    setError('');
    setSuccessMessage('');

    if (!selectedLocationId) {
      setError('Please select a location');
      return;
    }

    const criticalValue = parseInt(criticalThreshold, 10) || 0;
    const lowValue = parseInt(lowThreshold, 10) || 0;

    if (!criticalThreshold || !lowThreshold) {
      setError('Please enter both threshold values');
      return;
    }

    if (criticalValue >= lowValue) {
      setError('Critical threshold must be less than low stock threshold');
      return;
    }

    updateMutation.mutate(
      {
        id: selectedLocationId,
        data: {
          critical_stock_threshold: criticalValue,
          low_stock_threshold: lowValue,
        },
      },
      {
        onSuccess: () => {
          const name = selectedLocation?.name ?? 'store';
          setSuccessMessage(`Thresholds updated for ${name}`);
          setSelectedLocationId('');
        },
        onError: (err: any) => {
          setError(err.response?.data?.detail ?? 'Failed to update thresholds');
        },
      },
    );
  };

  return (
    <Card>
      <View style={styles.thresholdHeader}>
        <View style={styles.thresholdIconBox}>
          <Ionicons name="cube-outline" size={20} color={colors.primary[600]} />
        </View>
        <View style={styles.thresholdHeaderText}>
          <Text style={styles.sectionTitle}>Stock Thresholds</Text>
          <Text style={styles.thresholdSubtitle}>Configure alert levels for each store</Text>
        </View>
      </View>

      {locationsLoading ? (
        <ActivityIndicator size="small" color={colors.gray[400]} style={styles.loader} />
      ) : (
        <View style={styles.thresholdBody}>
          {/* Success banner */}
          {successMessage !== '' && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Location selector */}
          <Text style={styles.inputLabel}>Select Store</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="storefront-outline" size={18} color={colors.gray[400]} />
            <Text
              style={[
                styles.selectButtonText,
                !selectedLocationId && styles.selectButtonPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedLocation
                ? `${selectedLocation.name}${selectedLocation.type === 'warehouse' ? ' (Warehouse)' : ''}`
                : 'Select a store...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.gray[400]} />
          </TouchableOpacity>

          {/* Location picker modal */}
          <Modal visible={pickerVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Store</Text>
                  <TouchableOpacity onPress={() => setPickerVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.gray[600]} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={locations}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isSelected = item.id === selectedLocationId;
                    return (
                      <TouchableOpacity
                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                        onPress={() => {
                          setSelectedLocationId(item.id);
                          setPickerVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            isSelected && styles.modalItemTextSelected,
                          ]}
                        >
                          {item.name}
                          {item.type === 'warehouse' ? ' (Warehouse)' : ''}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color={colors.primary[600]} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.loader}>
                      <Text style={styles.emptyText}>No locations available</Text>
                    </View>
                  }
                />
              </View>
            </View>
          </Modal>

          {/* Threshold inputs -- only when location selected */}
          {selectedLocationId !== '' && (
            <>
              {thresholdsLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.gray[400]}
                  style={styles.loader}
                />
              ) : (
                <>
                  {selectedLocation && (
                    <View style={styles.selectedBanner}>
                      <Text style={styles.selectedBannerText}>
                        Setting thresholds for:{' '}
                        <Text style={styles.selectedBannerName}>
                          {selectedLocation.name}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {/* Critical */}
                  <Text style={styles.inputLabel}>Critical Stock Level (bags)</Text>
                  <Text style={styles.inputHint}>
                    Below this level triggers critical alerts (red zone)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 20"
                    placeholderTextColor={colors.gray[400]}
                    value={criticalThreshold}
                    onChangeText={setCriticalThreshold}
                    maxLength={4}
                  />

                  {/* Low */}
                  <Text style={styles.inputLabel}>Low Stock Level (bags)</Text>
                  <Text style={styles.inputHint}>
                    Below this level triggers low stock warnings (amber zone)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 50"
                    placeholderTextColor={colors.gray[400]}
                    value={lowThreshold}
                    onChangeText={setLowThreshold}
                    maxLength={4}
                  />

                  {/* Error */}
                  {error !== '' && (
                    <View style={styles.errorRow}>
                      <Ionicons name="warning" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* Save */}
                  <Button
                    title={`Save Thresholds${selectedLocation ? ` for ${selectedLocation.name}` : ''}`}
                    onPress={handleSave}
                    loading={updateMutation.isPending}
                    disabled={updateMutation.isPending}
                    icon={
                      <Ionicons name="save-outline" size={18} color={colors.white} />
                    }
                  />
                </>
              )}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  rowValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },

  // ── Thresholds section ──
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  thresholdIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdHeaderText: { flex: 1 },
  thresholdSubtitle: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: -spacing.sm,
  },
  thresholdBody: { gap: spacing.md },

  loader: { paddingVertical: spacing.lg, alignItems: 'center' },

  // Select button (replaces native Picker)
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  selectButtonText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray[900],
  },
  selectButtonPlaceholder: { color: colors.gray[400] },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '60%',
    paddingBottom: spacing['3xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  modalItemSelected: { backgroundColor: colors.primary[50] },
  modalItemText: { fontSize: fontSize.md, color: colors.gray[800] },
  modalItemTextSelected: { color: colors.primary[700], fontWeight: fontWeight.semibold },
  emptyText: { fontSize: fontSize.sm, color: colors.gray[400] },

  selectedBanner: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectedBannerText: { fontSize: fontSize.sm, color: colors.gray[600] },
  selectedBannerName: { fontWeight: fontWeight.semibold, color: colors.gray[900] },

  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: -spacing.sm + 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.gray[900],
    backgroundColor: colors.white,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: { fontSize: fontSize.sm, color: colors.error, flex: 1 },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#dcfce7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
});
