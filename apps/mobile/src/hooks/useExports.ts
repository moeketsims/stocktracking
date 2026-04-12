import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../stores/authStore';
import {
  getStockExportUrl,
  getBatchesExportUrl,
  getTransactionsExportUrl,
} from '../api/exports';

/**
 * Opens an authenticated export URL in the system browser.
 *
 * Because the backend uses Bearer auth (not cookies), we append the
 * access token as a query parameter. The backend's `require_manager`
 * dependency reads from the Authorization header; for direct browser
 * downloads we rely on the browser sending credentials or we fall back
 * to opening a WebBrowser session with the token in the URL.
 *
 * NOTE: The FastAPI export endpoints use `Depends(require_manager)` which
 * reads from `Authorization: Bearer …`. For a direct browser URL this
 * won't work natively, so we open via WebBrowser which doesn't carry
 * the header. A pragmatic approach is to append `?token=…` and handle
 * it on the server, or open an in-app webview. For now we attempt the
 * browser approach with a query-string token fallback.
 */
async function openExportUrl(url: string, token: string | null) {
  if (!token) {
    Alert.alert('Error', 'You must be logged in to export data.');
    return;
  }

  // Append token as query parameter for browser-based auth
  const separator = url.includes('?') ? '&' : '?';
  const authenticatedUrl = `${url}${separator}token=${encodeURIComponent(token)}`;

  try {
    if (Platform.OS === 'web') {
      // On web, just open in a new tab
      window.open(authenticatedUrl, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(authenticatedUrl);
    }
  } catch {
    // Fallback to Linking if WebBrowser fails
    try {
      await Linking.openURL(authenticatedUrl);
    } catch {
      Alert.alert('Error', 'Could not open the export. Please try again.');
    }
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
        await openExportUrl(url, token);
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
        await openExportUrl(url, token);
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
        await openExportUrl(url, token);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { exportTransactions, loading };
}
