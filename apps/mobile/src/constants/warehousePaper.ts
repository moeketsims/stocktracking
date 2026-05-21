/**
 * Warehouse Paper — design tokens for the Stock-area redesign.
 *
 * This token set is intentionally separate from `theme.ts`. It encodes a
 * different visual language: square corners, hard 1px shadows, ledger
 * typography. Stock screens import only from here; other screens keep
 * using `theme.ts`.
 *
 * Source: design_handoff_stock_warehouse_paper/README.md
 */

export const wp = {
  color: {
    // Warmer, more saturated paper per post-shipping color calibration.
    // OLED + LCD cross-check showed the original #F1EDE3 read as printer
    // paper; #ECE6D6 now reads correctly as muddy warm cream.
    paper: '#ECE6D6',
    paperAlt: '#E3DCC8',
    voucherBg: '#F6F1E2',
    ink: '#1A1916',
    ink2: '#5A5651',
    ink3: '#6F695F',
    // Dashed-divider color darkened so it still registers against the
    // warmer paper (was #D4CCB9).
    line: '#C9C0A8',
    lineD: '#1A1916',
    red: '#C23B1F',
    amber: '#C67F00',
    green: '#3B7A3A',
    tape: '#E6D486',
    pipeline: {
      pending: '#C67F00',
      accepted: '#1F3A8A',
      in_delivery: '#5B2CA5',
      trip_created: '#3B7A3A',
      time_proposed: '#1A1916',
      partially_fulfilled: '#C67F00',
      delivered: '#3B7A3A',
      fulfilled: '#3B7A3A',
      cancelled: '#8F8A7F',
      expired: '#C23B1F',
    } as Record<string, string>,
    criticalWash: 'rgba(194, 59, 31, 0.04)',
    criticalCallout: 'rgba(194, 59, 31, 0.05)',
  },

  /**
   * Typography tokens return `{ fontFamily, fontWeight }` so consumers can
   * spread them into a style. All three families are bundled as TTFs for
   * pixel-perfect match with the mock — use a development client (not
   * Expo Go) to avoid bundle-download timeouts over Wi-Fi.
   */
  font: {
    serifBold: { fontFamily: 'Fraunces_900Italic',       fontWeight: '900' as const },
    serifMid:  { fontFamily: 'Fraunces_700Italic',       fontWeight: '700' as const },
    sans:      { fontFamily: 'Inter_400Regular',         fontWeight: '400' as const },
    sansMid:   { fontFamily: 'Inter_500Medium',          fontWeight: '500' as const },
    sansSemi:  { fontFamily: 'Inter_600SemiBold',        fontWeight: '600' as const },
    sansBold:  { fontFamily: 'Inter_700Bold',            fontWeight: '700' as const },
    mono:      { fontFamily: 'JetBrainsMono_400Regular', fontWeight: '400' as const },
    monoMid:   { fontFamily: 'JetBrainsMono_500Medium',  fontWeight: '500' as const },
    monoSemi:  { fontFamily: 'JetBrainsMono_600SemiBold',fontWeight: '600' as const },
    monoBold:  { fontFamily: 'JetBrainsMono_700Bold',    fontWeight: '700' as const },
  },

  size: {
    stamp: 9,
    kicker: 10,
    label: 11,
    meta: 11,
    body: 13,
    bodyLg: 14,
    rowTitle: 15,
    rowTitleLg: 15,
    statBig: 22,
    statHero: 26,
    forecastBig: 32,
    titleScreen: 38,
    titleDashboard: 44,
    quantityVoucher: 24,
    heroNumberRow: 36,
    heroNumber: 96,
    heroNumberStaff: 180,
  },

  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 14,
    xl: 18,
    screenH: 20,
    block: 22,
    section: 28,
  },

  border: {
    thin: 1,
    mid: 1.5,
    thick: 2,
    stamp: 1.5,
    stampButton: 3,
  },

  shadow: {
    paper: { offsetX: 1, offsetY: 1, color: '#1A1916' },
    stamp: { offsetX: 4, offsetY: 4, color: '#1A1916' },
  },

  /** Alternates ±4deg per row for hand-stamped feel. */
  rotation: (rowIndex: number): number => (rowIndex % 2 === 0 ? -4 : 4),
} as const;

export type WpColor = keyof typeof wp.color;

/** Map our role-agnostic short stamp labels to their colors. */
export function stockStatusColor(status: string): string {
  if (status === 'critical' || status === 'out') return wp.color.red;
  if (status === 'low') return wp.color.amber;
  return wp.color.green;
}

export function stockStatusLabel(status: string): string {
  if (status === 'critical' || status === 'out') return 'CRIT';
  if (status === 'low') return 'LOW';
  return 'OK';
}

export function pipelineColor(status: string): string {
  return wp.color.pipeline[status] ?? wp.color.ink;
}

/**
 * Format a date as `18 FEB 2026` for kicker lines.
 */
export function fmtKickerDate(date = new Date()): string {
  return date
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

/**
 * Stable 3-digit "publication number" for the dashboard masthead.
 * Derived from a string seed (e.g. user id) so it doesn't churn on re-render.
 */
export function publicationNumber(seed: string | null | undefined): string {
  if (!seed) return '001';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return String((Math.abs(hash) % 900) + 100);
}
