import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { colors } from '../../src/constants/theme';

export default function ScanScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Barcode Scanner',
          headerStyle: { backgroundColor: colors.sidebar.DEFAULT },
          headerTintColor: colors.white,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <BarcodeScanner
          onScanComplete={(barcodes) => {
            // Return scanned barcodes — callers can pass params to customize behavior
            router.back();
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50] },
});
