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
    // Darkened from #6F695F, which measured 4.34:1 on `paper` — below the AA
    // 4.5:1 floor for the 11-12pt text it is actually used on. #635E54 measures
    // 5.17:1. Note this sits close to `ink2` (5.85:1): on a light paper ground
    // three distinct ink tiers cannot all clear AA, so tertiary hierarchy must
    // come from size/weight/case, not from lightness.
    ink3: '#635E54',
    // Dashed-divider color darkened so it still registers against the
    // warmer paper (was #D4CCB9).
    line: '#C9C0A8',
    lineD: '#1A1916',
    red: '#C23B1F',
    amber: '#C67F00',
    green: '#3B7A3A',
    tape: '#E6D486',
    /**
     * Status grammar — colour encodes URGENCY, not identity.
     *
     *   red   = act now          amber = attention soon
     *   green = healthy/done     ink   = in flight, nothing owed by you
     *
     * The previous map assigned an arbitrary hue per state (navy `accepted`,
     * purple `in_delivery`, green `trip_created`), which made colour useless
     * as a pre-attentive "does this need me?" channel — the one job colour has
     * in a logistics tool. Navy and purple are gone; in-flight states are now
     * neutral ink so the coloured rows are exactly the actionable ones.
     */
    pipeline: {
      // Waiting on a human decision → attention soon.
      pending: '#C67F00',
      time_proposed: '#C67F00',
      partially_fulfilled: '#C67F00',
      // Moving through the pipeline, nothing owed by the viewer → neutral.
      accepted: '#1A1916',
      trip_created: '#1A1916',
      in_delivery: '#1A1916',
      // Done.
      delivered: '#3B7A3A',
      fulfilled: '#3B7A3A',
      // Terminal, no longer actionable.
      cancelled: '#8F8A7F',
      // Failed / needs intervention.
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

  /**
   * Legibility floor: 12pt for anything informational.
   *
   * These screens are read on mid-range Androids on a warehouse floor, often
   * in direct sunlight. The previous 9-11pt uppercase-letterspaced-mono sizes
   * were the worst case for fast scanning: uppercase removes word-shape cues,
   * tracking breaks words apart, and small mono is already low-contrast.
   * `stamp` stays at 10 because stamps carry one short word in bold at high
   * colour contrast; `kicker` stays at 10 as pure decorative chrome that
   * duplicates the title beneath it.
   */
  size: {
    stamp: 10,
    kicker: 10,
    label: 12,
    meta: 12,
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

  /**
   * Font-scaling caps.
   *
   * The app previously passed `allowFontScaling={false}` on ~87 `<Text>` nodes,
   * which hard-ignores the OS text-size setting. A warehouse workforce skews
   * toward people who have turned that setting up, and refusing it outright is
   * both an accessibility failure and a legibility one — the users who most need
   * larger text are exactly the ones reading a bag count in a dim storeroom.
   *
   * Scaling is now honoured, but capped, because this layout has genuinely
   * fixed-geometry elements: a 96pt hero numeral at 2× scale would push the
   * ledger off-screen, and a stamp's outlined box is sized to its glyphs.
   * Caps by role:
   *
   *   `text`    1.6 — body copy, labels, ledger values. Generous; these reflow.
   *   `compact` 1.3 — text inside fixed-width chrome (stamps, tab labels,
   *                   button faces) where the container cannot grow much.
   *   `display` 1.15 — giant Fraunces numerals, which are already far above the
   *                   legibility floor and whose job is proportion, not size.
   */
  fontScale: {
    text: 1.6,
    compact: 1.3,
    display: 1.15,
  },

  /**
   * Stamps no longer rotate. ±4deg bought whimsy at the cost of legibility on
   * the shortest, most important strings in the app, and rotated outlined
   * rectangles read as decoration — blurring the line between status (passive)
   * and button (active) when both wear the same bordered-uppercase costume.
   *
   * Kept as a function returning 0 so existing `rowIndex` call sites stay valid.
   */
  rotation: (_rowIndex?: number): number => 0,
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
 * Format a timestamp as a short "last synced" string for the dashboard
 * masthead sub-line.
 *
 * This replaces `publicationNumber()`, a hash that invented a meaningless
 * 3-digit "No. 249" purely so the newspaper metaphor looked complete. Shipping
 * a number into a stock-control tool that answers "nothing" when a warehouse
 * manager asks what it means costs trust for no gain. The masthead slot now
 * carries the most useful fact available: how stale the data on screen is.
 */
export function fmtSyncedAt(date: Date | number | null | undefined): string {
  if (date == null) return 'Not synced';
  const then = typeof date === 'number' ? date : date.getTime();
  if (!Number.isFinite(then)) return 'Not synced';

  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 0) return 'Synced just now';
  if (mins < 1) return 'Synced just now';
  if (mins < 60) return `Synced ${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Synced ${hrs}h ago`;
  return `Synced ${Math.floor(hrs / 24)}d ago`;
}
