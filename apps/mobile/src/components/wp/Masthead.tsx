import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KickerLabel } from './KickerLabel';
import { MonoText } from './MonoText';
import { SerifNumber } from './SerifNumber';
import { wp } from '../../constants/warehousePaper';

interface BaseProps {
  kicker: string;
  title: string;
  /** Optional back arrow target for sub-screens. */
  backHref?: string;
  /** If true, calls router.back() instead of navigating to backHref. */
  backUseRouter?: boolean;
}

interface DefaultProps extends BaseProps {
  variant?: 'default';
}

interface DashboardProps extends BaseProps {
  variant: 'dashboard';
  /** Right-side kicker — the active location (e.g. "HARRISMITH"). */
  rightKicker?: string;
  /**
   * Sub-line left: who is signed in. Rendered plainly, without an invented
   * "Mgr." honorific — the role is already shown on the More tab.
   */
  managerName?: string;
  /**
   * Sub-line right: data freshness (e.g. "Synced 4m ago"), replacing the
   * former fake "No. 249" publication number.
   */
  syncedLabel?: string;
}

type Props = DefaultProps | DashboardProps;

/**
 * Masthead header — replaces the gradient header on every Stock screen.
 *
 * Variants:
 * - "default": single kicker line + italic Fraunces title.
 * - "dashboard": two-kicker top row + larger italic title + manager/no. sub-line.
 *
 * For sub-screens, pass `backHref` (or `backUseRouter`) to render an ink
 * back arrow above the kicker.
 */
export function Masthead(props: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Math.max(insets.top + 16, 60);

  const onBack = () => {
    if (props.backUseRouter) {
      router.back();
    } else if (props.backHref) {
      router.push(props.backHref as never);
    }
  };

  const showBack = props.backUseRouter || !!props.backHref;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {showBack && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={styles.back}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={wp.color.ink} />
        </TouchableOpacity>
      )}

      {props.variant === 'dashboard' ? (
        <>
          <View style={styles.kickerRow}>
            <KickerLabel size={10} tracking={2} color={wp.color.ink}>{props.kicker}</KickerLabel>
            {props.rightKicker ? (
              <KickerLabel size={10} tracking={2} color={wp.color.ink}>{props.rightKicker}</KickerLabel>
            ) : null}
          </View>
          <SerifNumber
            size={wp.size.titleDashboard}
            tracking={-1.5}
            leading={0.95}
            style={styles.title}
          >
            {props.title}
          </SerifNumber>
          {(props.managerName || props.syncedLabel) && (
            <View style={styles.subRow}>
              <MonoText size={wp.size.meta} tracking={0.4} color={wp.color.ink2} weight={500}>
                {props.managerName ?? ''}
              </MonoText>
              <MonoText size={wp.size.meta} tracking={0.4} color={wp.color.ink3} weight={400}>
                {props.syncedLabel ?? ''}
              </MonoText>
            </View>
          )}
        </>
      ) : (
        <>
          <KickerLabel size={wp.size.kicker} tracking={1.6} color={wp.color.ink3}>{props.kicker}</KickerLabel>
          <SerifNumber
            size={wp.size.titleScreen}
            tracking={-1}
            leading={1}
            style={styles.title}
          >
            {props.title}
          </SerifNumber>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: wp.space.screenH,
    paddingBottom: wp.space.lg,
    borderBottomWidth: wp.border.mid,
    borderBottomColor: wp.color.lineD,
  },
  back: {
    alignSelf: 'flex-start',
    paddingBottom: 8,
  },
  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    marginTop: 4,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
