import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { BagLogFAB } from './BagLogFAB';
import { UndoToast } from './UndoToast';
import { useBagUsage } from '../hooks/useBagUsage';

interface ToastState {
  visible: boolean;
  message: string;
}

export function BagLogContainer() {
  const { recentLog, canUndo, undoRecentLog, isUndoing } = useBagUsage();
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });

  const handleLogSuccess = useCallback((bagCount: number) => {
    setToast({
      visible: true,
      message: `${bagCount} bag${bagCount > 1 ? 's' : ''} logged successfully`,
    });
  }, []);

  const handleLogError = useCallback((error: Error) => {
    setToast({
      visible: true,
      message: `Error: ${error.message}`,
    });
  }, []);

  const handleUndo = useCallback(async () => {
    try {
      await undoRecentLog();
      setToast({
        visible: true,
        message: 'Bag log undone',
      });
    } catch {
      // Error handled by hook
    }
  }, [undoRecentLog]);

  const handleDismissToast = useCallback(() => {
    setToast({ visible: false, message: '' });
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BagLogFAB
        onLogSuccess={handleLogSuccess}
        onLogError={handleLogError}
      />

      <UndoToast
        visible={toast.visible && canUndo}
        message={toast.message}
        onUndo={handleUndo}
        onDismiss={handleDismissToast}
        isUndoing={isUndoing}
        duration={5000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
});
