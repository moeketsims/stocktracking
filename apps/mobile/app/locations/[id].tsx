import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useLocation,
  useLocationThresholds,
  useUpdateLocation,
  useUpdateThresholds,
  useDeleteLocation,
} from '../../src/hooks/useLocations';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, fontSize, fontWeight } from '../../src/constants/theme';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const location = useLocation(id);
  const thresholds = useLocationThresholds(id);
  const updateLocation = useUpdateLocation();
  const updateThresholds = useUpdateThresholds();
  const deleteLocation = useDeleteLocation();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [editingThresholds, setEditingThresholds] = useState(false);
  const [criticalThreshold, setCriticalThreshold] = useState('');
  const [lowThreshold, setLowThreshold] = useState('');

  const loc = location.data;
  const thresh = thresholds.data;

  function startEditing() {
    if (!loc) return;
    setEditName(loc.name);
    setEditAddress(loc.address ?? '');
    setEditing(true);
  }

  function saveEdit() {
    if (!loc) return;
    updateLocation.mutate(
      { id: loc.id, data: { name: editName, address: editAddress || undefined } },
      {
        onSuccess: () => {
          setEditing(false);
          location.refetch();
        },
      },
    );
  }

  function startEditThresholds() {
    if (!thresh) return;
    setCriticalThreshold(String(thresh.critical_stock_threshold));
    setLowThreshold(String(thresh.low_stock_threshold));
    setEditingThresholds(true);
  }

  function saveThresholds() {
    if (!loc) return;
    const critical = parseInt(criticalThreshold, 10);
    const low = parseInt(lowThreshold, 10);
    if (isNaN(critical) || isNaN(low)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }
    if (critical >= low) {
      Alert.alert('Error', 'Critical threshold must be less than low stock threshold');
      return;
    }
    updateThresholds.mutate(
      { id: loc.id, data: { critical_stock_threshold: critical, low_stock_threshold: low } },
      {
        onSuccess: () => {
          setEditingThresholds(false);
          thresholds.refetch();
        },
      },
    );
  }

  function confirmDelete() {
    if (!loc) return;
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${loc.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteLocation.mutate(loc.id, {
              onSuccess: () => router.back(),
            }),
        },
      ],
    );
  }

  if (location.isLoading) return <Loading fullScreen message="Loading location..." />;

  if (!loc) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Location not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: loc.name }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={location.isRefetching}
              onRefresh={() => {
                location.refetch();
                thresholds.refetch();
              }}
            />
          }
        >
          {/* Header */}
          <Card>
            <View style={styles.headerRow}>
              <Ionicons
                name={loc.type === 'warehouse' ? 'business' : 'storefront'}
                size={28}
                color={loc.type === 'warehouse' ? '#d97706' : colors.info}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{loc.name}</Text>
                <Badge
                  label={loc.type === 'shop' ? 'Shop' : 'Warehouse'}
                  variant={loc.type === 'shop' ? 'info' : 'warning'}
                />
              </View>
            </View>

            <View style={styles.detailGrid}>
              <DetailRow label="Zone" value={loc.zone_name ?? '—'} />
              <DetailRow label="Address" value={loc.address ?? 'Not set'} />
            </View>
          </Card>

          {/* Edit form */}
          {editing && isAdmin && (
            <Card>
              <Text style={styles.sectionTitle}>Edit Location</Text>
              <Input
                label="Name"
                value={editName}
                onChangeText={setEditName}
              />
              <Input
                label="Address"
                value={editAddress}
                onChangeText={setEditAddress}
                containerStyle={{ marginTop: spacing.md }}
              />
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => setEditing(false)}
                />
                <Button
                  title="Save"
                  size="sm"
                  onPress={saveEdit}
                  loading={updateLocation.isPending}
                />
              </View>
            </Card>
          )}

          {/* Thresholds */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stock Thresholds</Text>
              {!editingThresholds && isAdmin && (
                <Button
                  title="Edit"
                  variant="ghost"
                  size="sm"
                  onPress={startEditThresholds}
                />
              )}
            </View>

            {editingThresholds ? (
              <>
                <Input
                  label="Critical threshold (bags)"
                  value={criticalThreshold}
                  onChangeText={setCriticalThreshold}
                  keyboardType="number-pad"
                />
                <Input
                  label="Low stock threshold (bags)"
                  value={lowThreshold}
                  onChangeText={setLowThreshold}
                  keyboardType="number-pad"
                  containerStyle={{ marginTop: spacing.md }}
                />
                <View style={styles.buttonRow}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    size="sm"
                    onPress={() => setEditingThresholds(false)}
                  />
                  <Button
                    title="Save"
                    size="sm"
                    onPress={saveThresholds}
                    loading={updateThresholds.isPending}
                  />
                </View>
              </>
            ) : (
              <View style={styles.detailGrid}>
                <DetailRow
                  label="Critical"
                  value={`${thresh?.critical_stock_threshold ?? 20} bags`}
                />
                <DetailRow
                  label="Low Stock"
                  value={`${thresh?.low_stock_threshold ?? 50} bags`}
                />
              </View>
            )}
          </Card>

          {/* Admin actions */}
          {isAdmin && (
            <Card>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionButtons}>
                {!editing && (
                  <Button
                    title="Edit Location"
                    variant="outline"
                    onPress={startEditing}
                    icon={<Ionicons name="pencil" size={16} color={colors.primary[500]} />}
                  />
                )}
                <Button
                  title="Delete Location"
                  variant="danger"
                  onPress={confirmDelete}
                  loading={deleteLocation.isPending}
                  icon={<Ionicons name="trash" size={16} color={colors.white} />}
                />
              </View>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg, gap: spacing.lg },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerInfo: { flex: 1, gap: spacing.xs },
  headerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  detailGrid: { gap: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.gray[500] },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
    maxWidth: '60%',
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButtons: { gap: spacing.md },
});
