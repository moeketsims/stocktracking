import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useLocation,
  useLocationThresholds,
  useUpdateLocation,
  useUpdateThresholds,
  useDeleteLocation,
} from '../../src/hooks/useLocations';
import { Loading } from '../../src/components/ui/Loading';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  Stamp,
  HardShadowFrame,
  ActionStack,
  MonoInput,
  IntentStrip,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';

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

  const startEditing = () => {
    if (!loc) return;
    setEditName(loc.name);
    setEditAddress(loc.address ?? '');
    setEditing(true);
  };

  const saveEdit = () => {
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
  };

  const startEditThresholds = () => {
    if (!thresh) return;
    setCriticalThreshold(String(thresh.critical_stock_threshold));
    setLowThreshold(String(thresh.low_stock_threshold));
    setEditingThresholds(true);
  };

  const saveThresholds = () => {
    if (!loc) return;
    const c = parseInt(criticalThreshold, 10);
    const l = parseInt(lowThreshold, 10);
    if (isNaN(c) || isNaN(l)) {
      Alert.alert('Error', 'Enter valid numbers');
      return;
    }
    if (c >= l) {
      Alert.alert('Error', 'Critical must be less than low');
      return;
    }
    updateThresholds.mutate(
      { id: loc.id, data: { critical_stock_threshold: c, low_stock_threshold: l } },
      {
        onSuccess: () => {
          setEditingThresholds(false);
          thresholds.refetch();
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!loc) return;
    Alert.alert('Delete location', `Delete "${loc.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteLocation.mutate(loc.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  if (location.isLoading) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <Loading fullScreen message="" />
      </PaperBackground>
    );
  }

  if (!loc) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe}>
          <Masthead kicker="LOCATION" title="Not found" backUseRouter />
        </SafeAreaView>
      </PaperBackground>
    );
  }

  const recordNumber = (loc.id ?? '').slice(-4).toUpperCase();
  const isShop = loc.type === 'shop';
  const stamp = isShop
    ? { label: 'SHOP', color: '#1F3A8A' }
    : { label: 'WHSE', color: wp.color.amber };

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={location.isRefetching}
                onRefresh={() => {
                  location.refetch();
                  thresholds.refetch();
                }}
                tintColor={wp.color.ink2}
              />
            }
          >
            <Masthead
              kicker={`LOCATION · ${recordNumber}`}
              title={loc.name}
              backUseRouter
            />

            <View style={styles.heroWrap}>
              <HardShadowFrame>
                <View style={styles.hero}>
                  <View style={styles.heroTop}>
                    <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                      RECORD N° {recordNumber}
                    </KickerLabel>
                    <Stamp colorHex={stamp.color} rotate={-3}>
                      {stamp.label}
                    </Stamp>
                  </View>
                  <SerifNumber size={26} tracking={-1} leading={1.05} style={styles.heroName}>
                    {loc.name}
                  </SerifNumber>
                  <View style={styles.metaList}>
                    <MetaRow label="Zone" value={loc.zone_name ?? '—'} />
                    <MetaRow label="Address" value={loc.address ?? 'Not set'} />
                    <MetaRow
                      label="Critical"
                      value={
                        thresh?.critical_stock_threshold != null
                          ? `${thresh.critical_stock_threshold} bags`
                          : '—'
                      }
                    />
                    <MetaRow
                      label="Low"
                      value={
                        thresh?.low_stock_threshold != null
                          ? `${thresh.low_stock_threshold} bags`
                          : '—'
                      }
                    />
                  </View>
                </View>
              </HardShadowFrame>
            </View>

            {editing && isAdmin && (
              <View style={styles.formWrap}>
                <IntentStrip>Update the site name or street address.</IntentStrip>
                <MonoInput label="Name" value={editName} onChangeText={setEditName} />
                <MonoInput label="Address" value={editAddress} onChangeText={setEditAddress} />
              </View>
            )}

            {editingThresholds && isAdmin && (
              <View style={styles.formWrap}>
                <IntentStrip>
                  Critical triggers a red-alert page; low triggers an amber warning.
                </IntentStrip>
                <MonoInput
                  label="Critical · bags"
                  value={criticalThreshold}
                  onChangeText={setCriticalThreshold}
                  keyboardType="number-pad"
                />
                <MonoInput
                  label="Low · bags"
                  value={lowThreshold}
                  onChangeText={setLowThreshold}
                  keyboardType="number-pad"
                />
              </View>
            )}

            {isAdmin && (
              <View style={styles.actionsWrap}>
                {editing ? (
                  <ActionStack
                    actions={[
                      {
                        label: 'Save changes',
                        onPress: saveEdit,
                        filled: true,
                        loading: updateLocation.isPending,
                      },
                      { label: 'Cancel', onPress: () => setEditing(false), color: wp.color.ink3 },
                    ]}
                  />
                ) : editingThresholds ? (
                  <ActionStack
                    actions={[
                      {
                        label: 'Save thresholds',
                        onPress: saveThresholds,
                        filled: true,
                        loading: updateThresholds.isPending,
                      },
                      {
                        label: 'Cancel',
                        onPress: () => setEditingThresholds(false),
                        color: wp.color.ink3,
                      },
                    ]}
                  />
                ) : (
                  <ActionStack
                    actions={[
                      { label: 'Edit location', onPress: startEditing },
                      {
                        label: 'Edit thresholds',
                        onPress: startEditThresholds,
                        color: wp.color.amber,
                      },
                      {
                        label: 'Delete location',
                        onPress: confirmDelete,
                        color: wp.color.red,
                        loading: deleteLocation.isPending,
                      },
                    ]}
                  />
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <MonoText
        size={10}
        tracking={1.5}
        upper
        weight={600}
        color={wp.color.ink3}
        style={{ width: 80 }}
      >
        {label}
      </MonoText>
      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 60 },
  heroWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
  },
  hero: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroName: { marginTop: 10 },
  metaList: { marginTop: 14, gap: 8 },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
    alignItems: 'baseline',
  },
  metaValue: {
    flex: 1,
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    fontSize: 14,
    color: wp.color.ink,
  },
  formWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    gap: 4,
  },
  actionsWrap: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.section,
  },
});
