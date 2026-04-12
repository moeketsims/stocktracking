import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface BarcodeScannerProps {
  onScanComplete: (barcodes: string[]) => void;
  expectedCount?: number;
}

export function BarcodeScanner({ onScanComplete, expectedCount }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const cooldownRef = useRef(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera" size={48} color={colors.gray[400]} />
        <Text style={styles.permissionText}>Camera access is needed to scan barcodes</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (cooldownRef.current) return;
    if (scannedCodes.includes(data)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLastScanned(`Duplicate: ${data}`);
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 1500);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScannedCodes((prev) => [...prev, data]);
    setLastScanned(data);
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 1500);
  };

  const removeBarcode = (code: string) => {
    setScannedCodes((prev) => prev.filter((c) => c !== code));
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.crosshair} />
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>Scanned:</Text>
          <Text style={styles.countValue}>{scannedCodes.length}</Text>
          {expectedCount != null && (
            <>
              <Text style={styles.countLabel}> / </Text>
              <Text style={styles.countValue}>{expectedCount}</Text>
            </>
          )}
        </View>
        {lastScanned && (
          <Text style={styles.lastScanned} numberOfLines={1}>
            Last: {lastScanned}
          </Text>
        )}
      </View>

      {scannedCodes.length > 0 && (
        <FlatList
          data={scannedCodes}
          keyExtractor={(item, i) => `${item}-${i}`}
          style={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.barcodeRow}>
              <Text style={styles.barcodeIndex}>{index + 1}.</Text>
              <Text style={styles.barcodeText} numberOfLines={1}>{item}</Text>
              <TouchableOpacity onPress={() => removeBarcode(item)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.actions}>
        <Button
          title={`Done (${scannedCodes.length} bags)`}
          onPress={() => onScanComplete(scannedCodes)}
          disabled={scannedCodes.length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    height: 280,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.md,
    opacity: 0.7,
  },
  info: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countLabel: {
    fontSize: fontSize.md,
    color: colors.gray[600],
  },
  countValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary[500],
  },
  lastScanned: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  barcodeIndex: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    width: 28,
  },
  barcodeText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    color: colors.gray[700],
  },
  actions: {
    padding: spacing.lg,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
    gap: spacing.lg,
  },
  permissionText: {
    fontSize: fontSize.md,
    color: colors.gray[600],
    textAlign: 'center',
  },
});
