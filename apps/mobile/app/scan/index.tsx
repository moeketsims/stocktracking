import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import {
  PaperBackground,
  Masthead,
  IntentStrip,
  InkButton,
  MonoText,
} from '../../src/components/wp';
import { wp } from '../../src/constants/warehousePaper';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  // Permission still loading
  if (!permission) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe} />
      </PaperBackground>
    );
  }

  // Permission denied / not yet granted — warehouse-paper empty state
  if (!permission.granted) {
    return (
      <PaperBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <Masthead
            kicker="CAMERA — PERMISSION"
            title="Scan setup"
            backUseRouter
          />
          <View style={styles.body}>
            <IntentStrip>
              We need camera access to read bag barcodes. Turn it on once — you can
              disable it again later in your device settings.
            </IntentStrip>

            <View style={styles.buttonRow}>
              <InkButton
                label="Grant camera access"
                variant="solid"
                onPress={() => {
                  requestPermission();
                }}
              />
            </View>

            <MonoText
              size={9}
              tracking={1}
              upper
              color={wp.color.ink3}
              style={styles.hint}
            >
              If denied, open your device settings and enable Camera for Potato Stock
              to scan deliveries.
            </MonoText>
          </View>
        </SafeAreaView>
      </PaperBackground>
    );
  }

  // Permission granted — render the scanner
  return (
    <SafeAreaView style={styles.scannerSafe} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BarcodeScanner
        onScanComplete={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    gap: wp.space.block,
  },
  buttonRow: {
    alignItems: 'flex-start',
  },
  hint: {
    lineHeight: 15,
    marginTop: 4,
  },
  scannerSafe: {
    flex: 1,
    backgroundColor: '#000',
  },
});
