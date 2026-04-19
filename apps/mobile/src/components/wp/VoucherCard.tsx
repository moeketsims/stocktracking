import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Stamp } from './Stamp';
import { MonoText } from './MonoText';
import { SerifNumber } from './SerifNumber';
import { HardShadowFrame } from './HardShadowFrame';
import { wp, pipelineColor } from '../../constants/warehousePaper';

interface Props {
  /** Numeric/short ID printed in the stub (e.g. "1081" or last 4 of UUID). */
  ticketNumber: string;
  title: string;
  /** Secondary line under title — e.g. "TOMI A. · 12M AGO". */
  meta: string;
  quantityBags: number;
  status: string;
  /** Optional human-readable status label for the stamp. Defaults to status uppercased + truncated. */
  stampLabel?: string;
  rowIndex?: number;
  onPress: () => void;
}

const STAMP_LABEL: Record<string, string> = {
  pending: 'PENDING',
  accepted: 'ACCEPT',
  trip_created: 'TRIP SET',
  in_delivery: 'EN ROUTE',
  delivered: 'DELIVERED',
  fulfilled: 'FULFILLED',
  cancelled: 'CANCELLED',
  partially_fulfilled: 'PARTIAL',
  expired: 'EXPIRED',
  time_proposed: 'TIME PROP',
};

/**
 * Vertical dashed line, rendered as stacked 3-on-3-off rectangles.
 * RN's `borderStyle: 'dashed'` on a 1px border renders unreliably (often
 * shows as solid or not at all on iOS), so we draw it manually.
 */
function DashedVLine({ height, color }: { height: number; color: string }) {
  const unit = 6; // 3px dash + 3px gap
  const count = Math.floor(height / unit);
  return (
    <View style={{ width: 1, height }} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: i * unit,
            left: 0,
            width: 1,
            height: 3,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Voucher / ticket card used in the Requests pipeline list.
 * - Cream voucher bg (#F6F1E2), 1px solid ink border, hard 1×1 ink shadow.
 * - Dashed perforated stub at left 42px creates the ticket-stub affordance.
 * - Quantity in Fraunces italic 900 24pt tracking -0.5.
 * - Status stamp in outlined Stamp with alternating rotation per row.
 * - Square corners everywhere.
 */
export function VoucherCard({
  ticketNumber,
  title,
  meta,
  quantityBags,
  status,
  stampLabel,
  rowIndex = 0,
  onPress,
}: Props) {
  const stampColor = pipelineColor(status);
  const label = stampLabel ?? STAMP_LABEL[status] ?? status.toUpperCase();

  return (
    <HardShadowFrame style={styles.outerSpacing}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        <View style={styles.card}>
          <View style={styles.stub}>
            <MonoText size={9} weight={500} tracking={1} color={wp.color.ink3}>N°</MonoText>
            <MonoText size={12} weight={700} color={wp.color.ink}>{ticketNumber}</MonoText>
          </View>

          <View style={styles.perfWrap}>
            <DashedVLine height={56} color={wp.color.ink3} />
          </View>

          <View style={styles.body}>
            <MonoText
              size={14}
              weight={700}
              color={wp.color.ink}
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </MonoText>
            <MonoText
              size={10}
              tracking={1}
              upper
              color={wp.color.ink3}
              numberOfLines={1}
              style={styles.meta}
            >
              {meta}
            </MonoText>
          </View>

          <View style={styles.qtyCol}>
            <SerifNumber size={24} tracking={-0.5} leading={1} color={wp.color.ink}>
              {String(quantityBags)}
            </SerifNumber>
            <MonoText size={9} color={wp.color.ink3} tracking={0.8} upper style={{ marginTop: 1 }}>
              Bags
            </MonoText>
          </View>

          <Stamp colorHex={stampColor} rowIndex={rowIndex} style={styles.stamp}>
            {label}
          </Stamp>
        </View>
      </TouchableOpacity>
    </HardShadowFrame>
  );
}

const styles = StyleSheet.create({
  outerSpacing: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: wp.color.voucherBg,
    borderWidth: 1,
    borderColor: wp.color.lineD,
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 72,
  },
  stub: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  perfWrap: {
    height: 56,
    width: 1,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingLeft: 10,
    minWidth: 0,
  },
  title: {
    fontFamily: wp.font.sansSemi.fontFamily,
    fontWeight: wp.font.sansSemi.fontWeight,
    letterSpacing: 0,
  },
  meta: {
    marginTop: 2,
  },
  qtyCol: {
    alignItems: 'center',
    minWidth: 36,
    paddingRight: 2,
  },
  stamp: {
    marginLeft: 4,
  },
});
