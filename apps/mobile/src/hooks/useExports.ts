import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
// expo-file-system 18+ split into a new module surface; the classic
// `cacheDirectory` + `downloadAsync` helpers we use live in the
// `legacy` subpath now. See the migration note in the package README.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../stores/authStore';
import {
  getStockExportUrl,
  getBatchesExportUrl,
  getTransactionsExportUrl,
} from '../api/exports';

/**
 * Downloads an export file using the Authorization header (not a URL token)
 * and then shares it via the system share sheet.
 *
 * This avoids leaking the JWT in browser history, server logs, or referrer
 * headers that would happen with a ?token= query parameter approach.
 */
async function downloadAndShareExport(url: string, token: string | null, filename: string) {
  if (!token) {
    Alert.alert('Error', 'You must be logged in to export data.');
    return;
  }

  if (Platform.OS === 'web') {
    // On web we cannot use expo-file-system; inform the user
    Alert.alert('Export', 'Please use the web dashboard to download exports.');
    return;
  }

  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  try {
    const result = await FileSystem.downloadAsync(url, localUri, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status !== 200) {
      Alert.alert('Export Failed', 'The server returned an error. Please try again.');
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Save Export',
      });
    } else {
      Alert.alert('Saved', `File downloaded to ${result.uri}`);
    }
  } catch {
    Alert.alert('Error', 'Could not download the export. Please try again.');
  }
}

export function useExportStock() {
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.accessToken);

  const exportStock = useCallback(
    async (locationId?: string) => {
      setLoading(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = getStockExportUrl(token ?? '', locationId);
        await downloadAndShareExport(url, token, 'stock_export.xlsx');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { exportStock, loading };
}

export function useExportBatches() {
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.accessToken);

  const exportBatches = useCallback(
    async (locationId?: string) => {
      setLoading(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = getBatchesExportUrl(token ?? '', locationId);
        await downloadAndShareExport(url, token, 'batches_export.xlsx');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { exportBatches, loading };
}

export function useExportTransactions() {
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.accessToken);

  const exportTransactions = useCallback(
    async (opts?: { days?: number; typeFilter?: string; locationId?: string }) => {
      setLoading(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const url = getTransactionsExportUrl(token ?? '', opts);
        await downloadAndShareExport(url, token, 'transactions_export.xlsx');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { exportTransactions, loading };
}
