import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  PaperBackground,
  Masthead,
  KickerLabel,
  MonoText,
  SerifNumber,
  IntentStrip,
  ActionStack,
  HardShadowFrame,
  Stamp,
} from '../src/components/wp';
import { wp, fmtKickerDate } from '../src/constants/warehousePaper';

/**
 * Invitation success / hand-off screen.
 *
 * Shown after a manager creates an invitation (driver, user, anything).
 * Surfaces the in-person `short_code` in big mono so the manager can
 * read it aloud, copy it, or share via WhatsApp/SMS/etc. Email magic
 * link still goes out via the backend; this screen is the offline path.
 *
 * Expected query params:
 *   - code: the 6-char short_code from the backend response
 *   - recipient: name or email shown to the manager (for context)
 *   - role: optional, used in copy ("driver" / "manager" / "staff")
 *   - phone: optional E.164 number for the WhatsApp deep-link target
 *   - emailSent: '1' if the backend confirmed the email went out
 */
export default function InviteSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    recipient?: string;
    role?: string;
    phone?: string;
    emailSent?: string;
  }>();
  const [copied, setCopied] = useState(false);

  const code = (params.code ?? '').toUpperCase();
  const recipient = params.recipient ?? 'this person';
  const role = (params.role ?? 'user').toLowerCase();
  const phone = params.phone;
  const emailSent = params.emailSent === '1';

  const message =
    `Hello — your Potato Stock invite code is ${code}. ` +
    `Open the app, tap "Have an invite code?" on the sign-in screen, and enter it to set up your account.`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleWhatsApp = async () => {
    // wa.me click-to-chat — phone is optional. With a phone the message
    // is pre-targeted; without it WhatsApp opens with text and the
    // manager picks the recipient from contacts. No API key required.
    const digits = phone ? phone.replace(/[^0-9]/g, '') : '';
    const url =
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('WhatsApp not installed', 'Install WhatsApp or use the Share button instead.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Try the Share button instead.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message });
    } catch {
      // user dismissed share sheet — no action
    }
  };

  // Display the code with a dash in the middle for readability when read
  // aloud: "H7K2" "PXQ3" reads cleaner than "H7K2PXQ3".
  const displayCode =
    code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;

  return (
    <PaperBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Masthead
            kicker={`INVITATION SENT — ${fmtKickerDate()}`}
            title="Code generated"
            backUseRouter
          />

          <View style={styles.body}>
            <IntentStrip>
              {emailSent
                ? `An email has been sent to ${recipient}. You can also read this code aloud, share it via WhatsApp, or send it however suits — they enter it on the login screen.`
                : `Share this code with ${recipient}. They enter it on the login screen — no email needed.`}
            </IntentStrip>

            {/* Code voucher hero */}
            <View style={styles.heroWrap}>
              <HardShadowFrame>
                <View style={styles.hero}>
                  <View style={styles.heroTop}>
                    <KickerLabel size={10} tracking={2} color={wp.color.ink3}>
                      INVITE CODE
                    </KickerLabel>
                    <Stamp colorHex={copied ? wp.color.green : wp.color.ink} rotate={-3}>
                      {copied ? 'COPIED' : `${role.toUpperCase()}`}
                    </Stamp>
                  </View>
                  <SerifNumber
                    size={56}
                    tracking={-2}
                    leading={1}
                    color={wp.color.ink}
                    autoShrink
                    style={styles.codeText}
                  >
                    {displayCode || '—'}
                  </SerifNumber>
                  <MonoText
                    size={10}
                    tracking={1.5}
                    upper
                    color={wp.color.ink3}
                    style={styles.heroSub}
                  >
                    Expires in 7 days · single use
                  </MonoText>
                </View>
              </HardShadowFrame>
            </View>

            {/* Sharing actions */}
            <View style={styles.actionsWrap}>
              <ActionStack
                actions={[
                  {
                    label: copied ? 'Code copied ✓' : 'Copy code',
                    onPress: handleCopy,
                    color: copied ? wp.color.green : wp.color.ink,
                  },
                  {
                    label: 'Share via WhatsApp',
                    onPress: handleWhatsApp,
                    filled: true,
                  },
                  {
                    label: 'Share another way…',
                    onPress: handleShare,
                  },
                ]}
              />
            </View>

            {/* What the recipient does */}
            <View style={styles.steps}>
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>
                What they do
              </KickerLabel>
              <Step n={1} text="Open the Potato Stock app" />
              <Step n={2} text='Tap "Have an invite code?" on the sign-in screen' />
              <Step n={3} text={`Type ${displayCode || 'the code'} and pick a password`} />
              <Step n={4} text="Choose a 4-digit PIN — they're in" />
            </View>

            {/* Footer actions */}
            <View style={styles.footerActions}>
              <ActionStack
                actions={[
                  { label: 'Done', onPress: () => router.back(), color: wp.color.ink3 },
                ]}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PaperBackground>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <MonoText size={10} weight={700} color={wp.color.ink3} style={styles.stepNum}>
        {String(n).padStart(2, '0')}
      </MonoText>
      <Text maxFontSizeMultiplier={wp.fontScale.text} style={styles.stepText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  body: {
    paddingHorizontal: wp.space.screenH,
    paddingTop: wp.space.block,
    gap: wp.space.block,
  },

  heroWrap: {
    paddingTop: 4,
  },
  hero: {
    borderWidth: wp.border.mid,
    borderColor: wp.color.lineD,
    backgroundColor: wp.color.voucherBg,
    padding: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 4,
  },
  heroSub: {
    marginTop: 14,
    textAlign: 'center',
  },

  actionsWrap: {
    paddingTop: 4,
  },

  steps: {
    paddingTop: 6,
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: wp.color.line,
    borderStyle: 'dashed',
  },
  stepNum: {
    width: 22,
    paddingTop: 2,
  },
  stepText: {
    flex: 1,
    fontFamily: wp.font.serifMid.fontFamily,
    fontWeight: wp.font.serifMid.fontWeight,
    fontStyle: 'italic',
    fontSize: 15,
    color: wp.color.ink,
    lineHeight: 20,
  },

  footerActions: {
    paddingTop: wp.space.section,
  },
});
