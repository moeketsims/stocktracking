# Handoff — Stock Mobile Redesign · "Warehouse Paper" (Direction B)

## Overview

This package is the **complete** design handoff for the Stock mobile app redesign. It specifies **32 screens** covering every surface: stock views, orders, trips, loans, management rosters (drivers / users / vehicles / locations / zones / suppliers), reports, notifications, settings, scan permission, and sign-in.

**Read order:** Part I (screens 1–10) for the foundation, then Part II (screens 11–32) for the Wave-3 extension which is where the reusable primitives are defined. All Part II screens compose from the primitives in `reference/wp-primitives.jsx`; **port those primitives first**, then screens fall out in ~80 LOC each.

The design direction chosen is **"Warehouse Paper"**: an editorial, ledger-inspired aesthetic. Warm paper background, black ink, a serif display face for numerals and titles, monospaced type for data, and ink-stamp affordances for status. The goal is an app that feels unmistakably physical — made for people who handle real bags of charcoal all day — not generic SaaS.

**The functionality is unchanged.** Every existing flow (issue, transfer, request, accept, create trip, confirm delivery, stocktake, withdraw) must continue to work exactly as it does today. This is a visual + typographic redesign, not a feature rewrite.

## About the Design Files

The files in `reference/` are **design references written as inline JSX + HTML**. They are prototypes, not production code. Do **not** copy the JSX files into the real codebase. Instead:

1. Read them as the source of truth for **visual spec** (typography, color, spacing, layout, stamp affordances, hero numbers, masthead headers, ledger tables).
2. Re-implement each screen inside the existing React Native / Expo app, using the project's current component library, navigation, data hooks, and state management.
3. Preserve every function. If a button exists in the current app and is missing from the mock, keep the button — the mock is a style reference, not an exhaustive feature list.

If anything in the mock conflicts with a working feature in the live codebase, **the live codebase wins on behavior; the mock wins on appearance**.

## Fidelity

**High-fidelity.** Colors, typography, spacing, stroke weights, and rotations of stamp elements are all intentional. Hex values, font sizes, and letter-spacing should be honored to the pixel where the platform allows.

---

## Design Tokens

Put these in a single `theme/warehousePaper.ts` (or equivalent) and consume everywhere. Do not hand-code hex values in components.

### Colors

| Token              | Hex        | Use                                                     |
| ------------------ | ---------- | ------------------------------------------------------- |
| `paper`            | `#F1EDE3`  | App background, tab bar bg                              |
| `paperAlt`         | `#E8E3D6`  | Subtle panel tint                                       |
| `voucherBg`        | `#FBF8EF`  | Request/ticket card bg (slightly lighter than paper)    |
| `ink`              | `#1A1916`  | Primary text, primary borders, active tab               |
| `ink2`             | `#5A5651`  | Secondary text                                          |
| `ink3`             | `#8F8A7F`  | Tertiary text, labels, metadata                         |
| `line`             | `#D4CCB9`  | Dashed dividers, subtle borders                         |
| `lineD`            | `#1A1916`  | Strong borders (masthead underline, ledger header rule) |
| `red` / `critical` | `#C23B1F`  | Stamp red, critical stock, negative deltas, kitchen FAB |
| `amber` / `low`    | `#C67F00`  | Low-stock warning                                       |
| `green` / `ok`     | `#3B7A3A`  | Healthy stock, positive deltas, OK stamp                |
| `tape`             | `#E6D486`  | Masking-tape accent on staff stock hero                 |

Accent colors for request pipeline states:
- `accepted` → `#1F3A8A`
- `in_delivery` → `#5B2CA5`
- `trip_created` → `#3B7A3A`

### Typography

Three families. Load all three (Google Fonts or self-host):

- **`Fraunces`** — italic, weights 700 and 900. Used only for: screen title ("The Stockroom", "Stock Count", "On the shelf", "Requests"), hero numeric figures (total bags, staff on-hand count, voucher quantity), and urgent ticket number.
- **`Inter`** — weights 400/500/600/700. Body and card titles.
- **`JetBrains Mono`** — weights 400/500/600/700. All numeric data, all uppercase kickers/labels, all dates, all IDs.

Type scale (all values used in the mock):

| Role                          | Family            | Size | Weight | Letter-spacing | Notes                    |
| ----------------------------- | ----------------- | ---- | ------ | -------------- | ------------------------ |
| Masthead title (screen H1)    | Fraunces italic   | 38–44 | 900   | -1 to -1.5px  | line-height 0.95–1       |
| Dashboard hero number         | Fraunces          | 96   | 900   | -4px           | line-height 0.88         |
| Staff hero number ("82")      | Fraunces          | 180  | 900   | -10px          | line-height 0.82         |
| Urgent ticket number          | Fraunces          | 36   | 900   | -1px           |                          |
| Voucher quantity              | Fraunces          | 24   | 900   | -0.5px         |                          |
| Need-attention row number     | Fraunces          | 36   | 900   | -1px           | colored red/amber        |
| Forecast big numeric (3-col)  | JetBrains Mono    | 32   | 700   | -1px           |                          |
| Ledger "On hand" number       | JetBrains Mono    | 18   | 700   | —              | in row cells             |
| Stats band number (4-col)     | JetBrains Mono    | 26   | 700   | -0.5px         |                          |
| Row title                     | Inter             | 14–15| 600–700| —              |                          |
| Body                          | Inter             | 13–14| 400–500| —              |                          |
| Meta / secondary              | JetBrains Mono    | 10–11| 400–500| 0.5–1px        | often uppercase          |
| Kicker (section label)        | JetBrains Mono    | 10–11| 500–600| 1.5–2px        | uppercase                |
| Stamp text                    | JetBrains Mono    | 9    | 700    | 1.2px          | uppercase                |

### Spacing

Screen horizontal padding is **20px** throughout. Vertical rhythm uses 8 / 12 / 14 / 18 / 22 / 28px — don't invent new values. Card padding is 12–14px. Rows are 12–14px vertical. Section gaps between major blocks are 22px.

### Borders and Dividers

- Section underlines (masthead, ledger header): **1.5px solid `lineD`** (`#1A1916`)
- Card/voucher outer border: **1px solid `lineD`**, with a `1px 1px 0 lineD` hard-offset shadow (no blur) — this gives the "printed on paper" feel.
- Row dividers inside a list: **1px dashed `line`** (`#D4CCB9`)
- Critical alert border: **2px solid `red`** with background `rgba(194, 59, 31, 0.05)`

### Radius

**Zero.** No rounded corners anywhere except the kitchen withdraw button (which keeps sharp corners too — it's a physical "stamp"). This is a deliberate anti-pattern for the direction: squareness signals print/ledger.

### Shadows

Only one allowed: **`1px 1px 0 #1A1916`** on vouchers and the kitchen stamp button. No blurred shadows anywhere. Paper grain comes from a CSS repeating-linear-gradient (see "Paper background" below).

### Paper Background Recipe

Every screen root uses this layered background:

```css
background-color: #F1EDE3;
background-image:
  repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.025) 23px, rgba(0,0,0,0.025) 24px),
  radial-gradient(ellipse at top, rgba(255,255,255,0.4), transparent 60%);
```

On React Native, emulate with a repeating 1px horizontal hairline every 24px and a linear gradient overlay from the top. Keep the effect subtle — it should read as texture, not as ruled paper.

---

## Stamp Component

Used everywhere for status. Build a single `<Stamp>` component:

- **Props**: `color` (one of red/amber/green/blue/purple/ink), `children` (label text), `rotate` (degrees, default alternates -3 and +3 based on row index for visual rhythm).
- **Style**: 1.5px solid border matching the color, background transparent, same color for text, JetBrains Mono 9pt 700 weight, letter-spacing 1.2px, uppercase, padding 2px horizontal 8px vertical, `transform: rotate(Xdeg)`.
- **Usage**: status on locations (CRITICAL / LOW / OK), request status (PENDING / ACCEPT / EN ROUTE / TRIP SET), and inline callouts (URGENT).
- **Subtle randomness**: rotate alternates by row so a list of stamps doesn't look mechanical. Acceptable range: -4° to +4°.

---

## Screens

The four screens in this bundle are the highest-traffic surfaces. Redesign **all Stock-related screens** in the app to the same system — these four are the vocabulary-setters.

> Every screen's root is wrapped in the paper background. Every screen has the same type of **masthead header** (see pattern below). Every screen has the standard bottom tab bar.

### Masthead Header Pattern

Applied to every screen. Replaces the current gradient header.

- Top padding: 60px (safe area).
- Horizontal padding: 20px.
- A short **kicker line** in JetBrains Mono 9pt, letter-spacing 2px, uppercase, color `ink3`. Content: context (e.g. `"INVENTORY ROLL — 18 FEB 2025"`, `"KITCHEN LEDGER — LAGOS CENTRAL"`, `"ORDER DESK — 18 FEB 2025"`).
- A **screen title** in Fraunces italic, weight 900, size 38, tracking -1px. Content: a single evocative title, not a noun — `"Stock Count"`, `"On the shelf"`, `"Requests"`, `"The Stockroom"` (dashboard only).
- Bottom border: 1.5px solid `lineD` across the full width.
- No back button in the mock for these top-level screens. If a sub-screen needs one, place it to the **left** of the kicker as an ink arrow; the title stays below.

The dashboard is special-cased:
- Two kickers instead of one (volume/date on left, edition/location on right, full width flexed).
- Title: `The Stockroom` in Fraunces italic 44px.
- A second thin mono line under the title with `Mgr. {name}` on the left and `No. {random 3-digit}` on the right — keeps the "print publication" metaphor alive.

---

### Screen 1 — Dashboard (`B_Dashboard`)

**Who uses it**: location manager, opening the app.
**What they need in 2 seconds**: total bags on hand, today's in/out, anything broken.

**Layout, top to bottom:**

1. **Masthead** (see pattern).
2. **Hero stat block** — padding 22px × 20px, bottom border `1px solid line`.
   - Kicker: `On hand today` (JetBrains Mono 11pt 600, letter-spacing 1px, uppercase, color `ink`).
   - Big number: Fraunces 900 96pt, tracking -4px, color `ink`, line-height 0.88. Beside it, a small `bags` label in mono 12pt `ink2`.
   - Below, a one-line strip of three deltas in JetBrains Mono 11pt:
     - `+{received} IN` (number in `green` 700, label in `ink3`)
     - `−{issued} OUT` (number in `red` 700)
     - `{wasted} LOSS` (number in `amber` 700)
   - Gap of 16px between deltas.

3. **Locations — Ledger** — the signature component.
   - Section header bar: full-width, 20px horizontal padding. Left: kicker "LOCATIONS — LEDGER". Right: "{n} ENTRIES" in the same style, smaller (9pt).
   - Table header row: kickers in 9pt mono, columns `LOCATION | ON HAND (56px, right) | MIN (56px, right) | STATUS (70px, right)`. Underlined with 1px solid `lineD`.
   - One row per location. Row vertical padding 12px, bottom border `1px dashed line`.
     - **Location column**: Inter 14pt 600 for name. Below, mono 10pt `ink3`: `#{1000 + id} · {item short}` (e.g. `#1001 · 10kg`).
     - **On Hand column**: JetBrains Mono 18pt 700, right-aligned.
     - **Min column**: mono 12pt `ink3`, right-aligned.
     - **Status column**: `<Stamp>` with the appropriate color (`CRIT` red / `LOW` amber / `OK` green), rotation alternates.

4. **Forecast "classified ad"** — card at 22px top margin, 20px horizontal margin.
   - Outer: `1.5px solid lineD`, no radius, no shadow. 16px padding inside.
   - Floating label: positioned at `top: -10px, left: 14px`, with `background: paper` (so it cuts through the border), padding `0 8px`, text `FORECAST` in mono 10pt letter-spaced kicker style.
   - Inside: three columns of mono stats (big number 32pt 700, small label 10pt `ink3` uppercase):
     - Days cover
     - Daily rate
     - Suggest order (number in red — it's the action the manager should take)
   - Third column separated from the first two by a 1px dashed vertical divider.

5. **Tab bar** (see pattern).

---

### Screen 2 — Stock (Manager) (`B_StockManager`)

**Who uses it**: location manager reviewing all locations.
**What they need**: who's low, how low, one-tap to fix it.

**Layout:**

1. **Masthead**: kicker `INVENTORY ROLL — {date}`, title `Stock Count`.
2. **Summary band** — 4-column row, horizontal dividers only (1px `line`), bottom 1.5px `lineD`.
   - Each cell: mono 26pt 700 number, mono 9pt 1.5-letter-spaced label below. Columns: TOTAL (ink), CRIT (red), LOW (amber), OK (green).
3. **Action strip** — padding 16px × 20px, 8px gap, wrap.
   - Buttons: `Issue`, `Transfer`, `Request`, `Stocktake`, `Waste`, `Export`.
   - Styling: transparent bg, 1.5px solid `lineD`, 6px vertical 12px horizontal padding, mono 11pt 600 letter-spaced uppercase, color `ink`. No radius. Hover/active: invert (ink bg, paper text).
4. **"Needs attention" section**.
   - Header row: kicker left (`Needs attention`), right-aligned count kicker (`{n} OF {total}`).
   - For each flagged location (critical then low):
     - 14px × 20px padding row, bottom border `1px dashed line`, gap 12px.
     - Leftmost: an 8px wide × 50px tall **solid colored bar** (red for critical, amber for low). This is the hero accent.
     - Middle flex column: location name (Inter 15pt 700), mono 10pt below: `NEED +{shortage} / MIN {min}` where `+{shortage}` is colored and 700.
     - Right: Fraunces 36pt 900 big number (colored red/amber, tracking -1px, line-height 1).
     - Far right: `<Stamp>` with label `CRITICAL` or `LOW`.
     - **First critical row gets a faint wash** — background `rgba(194, 59, 31, 0.04)` — to anchor the eye.
5. **"In stock" section** — more compressed.
   - Kicker `In stock`. One row per OK location.
   - Row contents: mono 10pt `ink3` 2-digit zero-padded index on the left (`01`, `02`…), then name (Inter 14pt 500), then mono 16pt 600 bag count, then `<Stamp color=green>OK</Stamp>`.
   - Divider: 1px dashed `line`.

---

### Screen 3 — Stock (Staff quick-withdraw) (`B_StockStaff`)

**Who uses it**: kitchen staff, one-handed, in a hurry, possibly with sticky fingers.
**What they need**: "I took a bag" → done in one tap. "How many left" readable from 2m away.

**Layout:**

1. **Masthead**: kicker `KITCHEN LEDGER — {location uppercase}`, title `On the shelf`.
2. **Hero bag counter** — the signature element.
   - Padding 28px × 20px, centered, `text-align: center`, bottom border `1px solid line`.
   - Number: Fraunces 900 **180pt**, tracking -10px, line-height 0.82. The exact current bag count (mocked as `82`).
   - Below: mono 11pt 2-letter-spaced `BAGS · CHARCOAL 10KG` in `ink3`.
   - **Tape accent**: a masking-tape rectangle at top-right.
     - Absolutely positioned: top 18px, right -8px.
     - Size: 72 × 22px. Background `tape` (`#E6D486`). Opacity 0.85. `transform: rotate(14deg)`. Box shadow `0 1px 3px rgba(0,0,0,0.08)`.
     - Text inside (also rotated 14°): mono 9pt 700 letter-spaced `RESTOCKED` in ink.
   - Hand-draw the tape as a sibling element, not a pseudo-element — easier to animate and conditionally show (e.g. only show if restocked in last 72h).
3. **Today's log**.
   - Kicker `Today's log` with 18px × 20px padding.
   - One row per activity entry, 12px × 20px padding, 1px dashed bottom.
   - Left column (40px wide): mono 10pt `ink3`, e.g. `8M AGO`.
   - Middle column: mono 14pt 700 in red (withdrawals) or green (returns): `−2 BAGS`. Below, if note exists, italic Inter 12pt `ink2`: `"Lunch service"` (wrap in quotes).
4. **Kitchen stamp-button** — absolutely positioned FAB replacement.
   - Position: `bottom: 96px, right: 16px`.
   - 104 × 104px. `background: red`. 3px solid `ink` border. No radius.
   - Hard shadow: `4px 4px 0 #1A1916`. `transform: rotate(-3deg)`.
   - Stack inside (centered):
     - Fraunces 900 44pt, tracking -2px, line-height 1: `−1`
     - mono 10pt 2-letter-spaced 700: `BAG OUT`
   - On press: animate rotation to 0°, translate the shadow to 0 0, fire haptic, decrement count. On release: spring back.
   - Long-press opens a quantity picker.
5. **Tab bar**.

---

### Screen 4 — Requests (`B_Requests`)

**Who uses it**: location manager accepting/routing requests from other locations.
**What they need**: see the pipeline, triage the urgent one, dispatch the rest.

**Layout:**

1. **Masthead**: kicker `ORDER DESK — {date}`, title `Requests`.
2. **Ledger summary band** — 14px × 20px, bottom 1.5px `lineD`.
   - Three inline stats, mono, 16px gap:
     - `5 ACTIVE` (22pt 700 number + 10pt kicker)
     - `1 URGENT` (number in red)
     - `23 THIS WK`
3. **Urgent ticket** — a framed callout at 16px margin.
   - 2px solid `red` border, background `rgba(194,59,31,0.05)`, no radius.
   - Floating label top-left (same cutout trick as the dashboard forecast card): `URGENT TICKET` in mono 10pt 700 1.5-letter-spaced red on paper background.
   - Body: location name Inter 15pt 700 on the left; mono 11pt `ink2` underneath with `{req id} · {name} · {time} ago`; Fraunces 900 36pt red number on the right.
   - The whole card is tappable and opens the request detail screen.
4. **Active tickets list** — the voucher-style items.
   - Section kicker: `Active tickets`.
   - Each ticket:
     - Background `#FBF8EF` (warmer than paper).
     - 1px solid `ink` border. Hard offset shadow `1px 1px 0 #1A1916`. No radius.
     - Padding 12px × 14px. 10px bottom margin between tickets.
     - Internal **dashed vertical divider** at left 42px (creates a "stub" column for the ticket number).
     - Stub column (36px wide, centered): mono 9pt `ink3` `N°`, below it mono 12pt 700 the numeric part of the id (`1081`).
     - Middle: location Inter 14pt 600; mono 10pt 1-letter-spaced `{NAME UPPERCASE} · {TIME} AGO` in `ink3`.
     - Right numeric column: Fraunces 900 24pt quantity, mono 9pt `BAGS` label.
     - Far right: `<Stamp>` with the status label and the status-appropriate color, alternating rotation.
5. **Tab bar**.

---

### Screen 5 — Place an Order (`D_PlaceOrder`)

**Who uses it**: any location user requesting a replenishment.
**What they need**: choose a quantity and urgency, hit one button.

**Layout:**

1. **Masthead**: kicker `NEW ORDER — {date}`, title `Place an order`.
2. **Intent strip** — quote-block style. Full-width card, `1px solid lineD`, bg `#F6F1E2`, hard shadow `1px 1px 0 lineD`, 12px padding. A 3px wide solid `ink` vertical rule at left, then Fraunces italic 13pt 400 explanatory copy to its right. Use this pattern anywhere a screen needs a short "what this is for" explainer.
3. **Quantity field** — `DFieldBox` (shared pattern: JetBrains Mono 11pt letter-spaced 1px uppercase label, 14px vertical rhythm, bottom border `1px dashed line`).
   - Inside the field: Fraunces italic 900 56pt em-dash placeholder (tracking -2px) in `ink3`, flex-aligned with 4 stamp-style preset chips on the right (`5`, `10`, `20`, `50`) — each mono 11pt 600 letter-spaced, 1.5px solid `lineD` border, 6×10 padding.
   - Hint below: kicker `TAP A STAMP OR TYPE A NUMBER` in 9pt.
4. **Urgency field** — two side-by-side tiles, flex-1 each.
   - Selected tile: bg `ink`, color `paper`, 2px solid `lineD`, hard shadow `2px 2px 0 lineD`. Unselected: 1.5px solid `lineD`, transparent.
   - Each tile: Fraunces italic 900 22pt title (`Normal` / `Urgent` — urgent is `red`), mono 9pt 1.5-letter-spaced subtitle.
5. **Notes field** — 1.5px solid `lineD`, bg `#F6F1E2`, 12px padding, min-height 72px. Placeholder in Fraunces italic 14pt `ink3`.
6. **Primary bar** — fixed above tab bar, 10×20 padding, top border 1.5px `lineD`, bg paper. Contains the shared `DPrimaryBar`: full-width 54px ink-filled button, `2px solid lineD`, hard shadow `3px 3px 0 lineD`, mono 13pt 700 letter-spaced `CREATE REQUEST`.

### Screen 6 — Request Detail (`D_RequestDetail`)

**Who uses it**: the location manager reviewing or acting on one specific request.

**Layout:**

1. **Masthead** with a back arrow on the line above the kicker. Kicker: `REQUEST · {ID} · {date}`. Title: `Request detail`.
2. **Voucher card** (primary artefact of this screen).
   - `1px solid lineD`, bg `#F6F1E2`, hard shadow `1px 1px 0 lineD`, padding 14×16.
   - Top row: `VOUCHER N° {id}` kicker left; `<Stamp color=amber rotate=3>PENDING</Stamp>` right.
   - Hero quantity: Fraunces italic 900 88pt number (tracking -3, line-height 0.9), mono 11pt `BAGS` label beside it.
   - Meta ledger: 4 dashed-rule rows (`DELIVER TO`, `REQUESTED BY`, `CREATED`, `NOTES`). Key in mono 10pt 1.5-letter-spaced `ink3`, value in Inter 13pt 600.
3. **Stock info panel** — labeled `Stock info` kicker. 1.5px solid `lineD` rectangle containing two rows: `CURRENT STOCK` and `TARGET STOCK` separated by a 1px dashed divider. Numbers in mono 14pt 700, secondary detail in `ink3`.
4. **Action stack** — three full-width buttons, stacked with 10px gap. Style:
   - `RESEND TO DRIVERS`, `EDIT REQUEST`: transparent bg, 1.5px solid `ink`, mono 12pt 700 1.8-letter-spaced text in ink, hard shadow `1px 1px 0 lineD`, 14×16 padding.
   - `CANCEL REQUEST`: destructive — filled `red` background, paper text, 1.5px solid `red` border.

### Screen 7 — Stock Take (`D_StockTake`)

**Who uses it**: a location manager during monthly count.

**Layout:**

1. **Masthead**: kicker `STOCK TAKE — {date}`, title `Count it up`.
2. **Tab strip** — just below masthead. Two tabs (`ACTIVE COUNT`, `HISTORY`). Equal flex, mono 11pt, active is 700 with a 3px solid `ink` underline (offset -1.5px so it sits flush with the masthead rule). Inactive 500 `ink3`.
3. **Progress voucher** — ticker-style progress.
   - Voucher styling (see shared recipe). Title Fraunces italic 22pt 900 location name left; `{counted}/{total} COUNTED` mono 11pt right.
   - Progress bar: 8px tall, 1px solid `lineD` outer. Inside, 20 equal cells with 1px paper gaps. Filled cells are `ink`. This replaces a smooth progress bar with a "ticks counted" feel.
4. **Item voucher** — one per item in the count.
   - Voucher styling. Top row: item name Fraunces italic 900 20pt; SKU kicker under it; `<Stamp color=green rotate=3>COUNTED</Stamp>` on the right.
   - 3-column grid (`EXPECTED`, `COUNTED`, `VARIANCE`) separated from header by a dashed rule.
     - EXPECTED: mono 22pt 700 `ink`.
     - COUNTED: mono 22pt 700, underlined with 1.5px solid `lineD` (signals editable).
     - VARIANCE: Fraunces italic 900 24pt, colored red if negative / green if positive. Tracking -1px.
5. **Action stack**:
   - Primary: `COMPLETE STOCK TAKE` — ink-filled, 16px padding, hard `3px 3px 0 lineD` shadow.
   - Secondary: `CANCEL COUNT` — transparent, 1.5px solid `red`, red mono text, 12px padding.

### Screen 8 — Transfer Stock (`D_Transfer`)

**Who uses it**: a location manager moving stock to another location.

**Layout:**

1. **Masthead**: kicker `STOCK MOVEMENT — {date}`, title `Transfer stock`.
2. **Intent strip** (same explainer pattern as Place Order).
3. **From field** — one-line tile showing the user's own location. Bg `ink`, paper text, 1.5px solid `lineD`, 12px padding. Contains a `◉` radio glyph, Fraunces italic 900 20pt location name, mono 9pt `{n} ON HAND` pushed to the right at 60% opacity.
4. **Destination field** — bordered list (1.5px solid `lineD`).
   - Each row: 12×14 padding, dashed bottom rule, 14×14px checkbox (1.5px solid `lineD`, filled `ink` with paper `✓` when selected), Fraunces italic 700 16pt location name, mono 9pt 1.5-letter-spaced type label (`SHOP` / `WAREHOUSE`) in `ink3`.
   - Selected row: background `rgba(26,25,22,0.05)`.
5. **Quantity field**:
   - Giant numeric display: Fraunces italic 900 56pt (tracking -2) for the chosen amount, mono 11pt `/ {max} available` in `ink3`.
   - Quick chips: `25`, `50`, `100`, `250`, `MAX`. Each flex-1, mono 11pt 600 letter-spaced, 1.5px solid `lineD`, 6px vertical padding. No fill on unselected.
6. **Primary bar**: `TRANSFER {n} BAGS →`.

### Screen 9 — More / Staff Record (`D_More`)

**Who uses it**: anyone accessing secondary destinations (alerts, drivers, settings, sign out).

**Design metaphor**: the "More" tab is reframed as a **staff record** — the user is the entry, the menu is a ledger of every sub-area in the app.

**Layout:**

1. **Masthead**: kicker `STAFF RECORD — {date}`, title `The Back Office` (Fraunces italic 36pt 900, tracking -1).
2. **ID card** — immediately under the title, within the masthead block (before its bottom rule).
   - 1.5px solid `lineD`, bg `#F6F1E2`, hard shadow `2px 2px 0 lineD`, 12px padding, flex row with 12px gap.
   - Avatar: 48×58 rectangle (passport-photo ratio), 1.5px solid `lineD`, bg `ink`, Fraunces italic 900 26pt initial in paper color, centered.
   - Body: name Fraunces italic 900 22pt; email mono 10pt `ink3` uppercase letter-spaced 1px, truncated with ellipsis; a row of `<Stamp color=ink rotate=-3>LOC-MGR</Stamp>` + mono 10pt `· {LOCATION UPPERCASE}`.
3. **Ledger header** — 8×0 4×0 padding, bottom 1.5px `lineD`, mono 9pt 1.5-letter-spaced: columns `ENTRY` (flex), `STATUS` (110px right-aligned), a 14px spacer for the chevron.
4. **Ledger rows** — one per menu item. 14×0 padding, dashed 1px bottom rule.
   - 22px column: zero-padded index (`01`, `02`…) mono 10pt `ink3`.
   - Flex entry name: Fraunces italic 700 17pt.
   - Status: mono 10pt letter-spaced uppercase, colored per state (`red` for alerts, `amber` for pending/notifications, `green` for active/in-progress, `ink3` for neutral / empty).
   - Trailing chevron: mono 12pt `›` `ink3`.
   - **Menu items in order**: Alerts · Pending deliveries · Loans · Drivers · Batches · User management · Stock take · Vehicles · Reports & analytics · Notifications · Settings.
5. **Sign out** — centered, 22px top margin. Transparent bg, 1.5px solid `red`, hard shadow `1px 1px 0 red`, 12×24 padding, mono 11pt 700 2-letter-spaced `SIGN OUT →`.
6. **Tab bar** — `active="more"`.

### Screen 10 — Sign In (`D_Login_Ledger`)

**Who uses it**: any user opening the app, not yet signed in.
**What they need**: email, password, one tap.

**Design approach**: the login is rendered in the **Ledger** variation — no card, no decorative container. The whole screen is the form: masthead headline, two ruled fields on paper, one big ink button. The goal is consistency with every other top-level screen (Dashboard, Requests, Stock Count) which all open with a masthead-first layout. Login should feel like the first page of the logbook, not a separate mini-app.

**Layout, top to bottom:**

1. **Masthead** (screen root padding 52×20 top/sides, 40px bottom).
   - Kicker: `STAFF LOGBOOK — SIGN IN` in mono 9pt 1.5-letter-spaced `ink3`.
   - Title: `Who's` / `at the door?` — Fraunces italic 900 52pt, tracking -2px, line-height 0.95. **Breaks onto two lines manually** — the `<br/>` is intentional, not a wrap. Keeps the rhythm when the device is narrow.
   - Sub-kicker: mono 10pt 1.2-letter-spaced `ink2`: `Sign in to Potato Stock — {date}`. The brand name `Potato Stock` is bolded (`ink`, 700 weight). Date uses `fmtDateB()` format (see `mockdata.jsx`): `18 FEB 2025`.
   - Bottom border: 1.5px solid `lineD` across full width.

2. **Field block** — starts 8px below masthead.
   - Two stacked fields, **no border, no card, no background** — just rhythm.
   - Per field: 18px top padding, 10px bottom padding, 1px dashed `line` bottom rule.
     - **Label row**: flex row, justify-between.
       - Left: field label (`EMAIL`, `PASSWORD`) in mono 11pt 600 1px-letter-spaced uppercase `ink`.
       - Right (password only): `SHOW` affordance in mono 10pt 700 1.2-letter-spaced `ink3`. Tapping toggles visibility.
     - **Value row**: 8px top margin.
       - **Empty / placeholder state (email)**: Fraunces italic 400 20pt in `ink3`, content: `you@example.com`.
       - **Filled state & password field**: JetBrains Mono 18pt `ink` with 4px letter-spacing. Password masked as `••••••••••`.
   - This is the only real place in the app where Fraunces is used for non-headline text — the italic placeholder reinforces that the field is waiting for an entry, like a blank line on a form.

3. **Controls row** — 20px top margin, flex row, justify-between, align center.
   - Left: 14×14 square checkbox, 1.5px solid `lineD`, unfilled by default. When checked: filled `ink`, paper `✓` glyph, 10pt 900 weight. 10px gap to label. Label: mono 10pt 1-letter-spaced `REMEMBER ME` in `ink`.
   - Right: mono 10pt 1.2-letter-spaced `FORGOT?` in `ink`, underlined with `text-underline-offset: 3px`. Tappable link → forgot-password flow.

4. **Submit button** — 28px top margin.
   - Full width, padding 20px vertical.
   - Background `ink`, text `paper` color (`#ECE6D6`), 2px solid `lineD` border.
   - Label: mono 14pt 700 3-letter-spaced `ENTER THE STOCKROOM` (all caps). Do not shorten to "Sign In" — the copy is load-bearing for the metaphor.
   - Hard offset shadow `4px 4px 0 #1A1916`. No blur.
   - Press state: translate the button 4px down and 4px right, shadow collapses to `0 0 0 lineD`. 80ms ease. Haptic `impactLight`.
   - Disabled: bg `#5A5651` (`ink2`), 70% opacity on shadow.

5. **Footer band** — pushed to bottom with `margin-top: auto`, 32px top padding.
   - Top border: 1.5px solid `lineD` across width.
   - Flex row, justify-between, align baseline, 12px top padding.
   - Left: mono 9pt 1.5-letter-spaced `ink3`, two lines: `POTATO STOCK` / `v1.0.0 · ED.SA`.
   - Right: Fraunces italic 900 56pt `01` in `ink3`, tracking -2px, line-height 0.9. This is the "issue number" — same visual trick used in the dashboard masthead. On subsequent screens post-login, this number would increment or change to reflect the section; on the login, `01` anchors it as the first page.

6. **No tab bar.** Login is pre-auth; the bottom tab bar only appears once a session exists.

**Error states:**
- Invalid credentials: replace the sub-kicker under the title with a 2px solid `red` callout (same pattern as the dashboard's Urgent Ticket) containing `<Stamp color=red rotate=-3>INCORRECT</Stamp>` + mono 11pt 500 `ink` copy: `Check your email and password — or request access.`
- Network error: same pattern, stamp reads `OFFLINE`, copy reads `Couldn't reach the warehouse. Try again.`

**Loading state (button pressed):**
- Button label swaps to a row of three mono dots `· · ·` animating one at a time at 120ms intervals. No spinners.

**Keyboard behavior:**
- Email field autofocus on mount. `keyboardType: 'email-address'`, `autoCapitalize: 'none'`, `autoCorrect: false`, `textContentType: 'emailAddress'`.
- Password: `secureTextEntry: true`, `textContentType: 'password'`.
- Return key on email → focus password. Return on password → submit.

**First-run / new-user path:**
- There is no "create account" affordance — accounts are provisioned by managers (see User Management in the More menu). If the user needs access and doesn't have it, point them at the `FORGOT?` link, which also handles "I don't have an account" via a secondary button in that flow.

---

Extract these into the real codebase as first-class primitives:

- **`Masthead({ kicker, title, back? })`** — the 52/20/14 padding header with mono kicker and italic Fraunces title.
- **`Voucher`** — the `1px solid lineD` + `#F6F1E2` bg + hard `1px 1px 0` shadow card. Parent of voucher quantity, ticket, item, and progress patterns.
- **`DFieldBox({ label, children })`** — 14px vertical rhythm form field with mono label and dashed bottom rule.
- **`Stamp({ color, rotate?, children })`** — bordered, transparent-fill, rotated status stamp.
- **`PrimaryBar({ label, disabled? })`** — sticky bottom action button container.
- **`LedgerRow`** — the ledger table row primitive used on Dashboard locations, Stock Take items, and More menu. Takes index, primary (italic), secondary (mono/ink3), trailing (stamp or chevron).
- **`IntentStrip({ children })`** — the 3px left-rule + italic copy explainer card.
- **`BottomTabs({ active })`** — the shared 80px bottom nav.

These eight primitives render 90% of the system. If a new screen can't be composed from them, flag it before adding a new primitive.

---

## Bottom Tab Bar (all screens)

- Position fixed at bottom, height 80px, `padding-bottom: 22px, padding-top: 6px` (last 22px reserved for home indicator on iOS).
- Background: `paper` (same as screen). Top border 1.5px solid `lineD`.
- 5 items, equal flex, centered stack of icon + label:
  - **HOME** (home icon), **ORDERS** (document icon), **TRIPS** (truck icon), **STOCK** (cube icon), **MORE** (grid icon).
- Icon: 20px stroke. Active state: stroke-width 2, color `ink`. Inactive: stroke-width 1.5, color `ink3`.
- Label: JetBrains Mono 9pt, letter-spacing 1px. Active: 700 weight. Inactive: 500.
- **No orange/red active indicator** — this direction uses weight and color contrast only.

---

## Icon System

The prototype uses a small inline SVG set (see `reference/icons.jsx`). Keys used across these screens: `home`, `doc`, `car`, `cube`, `grid`, `chev`, `warn`, `pkg`, `arrU`, `arrD`, `plus`, `min`, `filter`, `check`, `x`, `clock`.

Replace with the project's existing icon library (Feather, Lucide, Phosphor — whichever you're on). Match weights: **1.5–2px stroke, round caps, round joins**. If the current app uses filled icons, switch to outlined for this redesign — the paper aesthetic depends on line-only iconography.

---

## Interactions & Behavior

All existing gestures and flows are preserved. The new visual treatments add a few behaviors:

- **Stamp press**: scale down 0.95 on press, spring back. No hover state (mobile).
- **Voucher tap** (requests): entire card is the target. Open request detail.
- **Kitchen stamp button**:
  - Tap → haptic `impactMedium`, optimistic decrement, POST withdraw.
  - Animation: rotate to 0°, translate shadow to (0, 0) over 80ms, then back to resting on release.
  - Long-press (400ms) → open quantity picker modal. Picker should match the paper system: paper bg, stamp-style numeric buttons.
- **Pull-to-refresh**: the spinner should be a simple ink hairline progress bar, not a colorful iOS spinner. Keep platform-default behavior if customization is expensive.
- **Empty states**: use the masthead style — big italic Fraunces headline, small mono subtitle, optional stamp-style CTA button. Do not use illustrations unless the design team provides them.
- **Loading states**: skeleton rows in `paperAlt` color (`#E8E3D6`), no shimmer (too "digital" for this aesthetic) — a subtle 1.2s fade pulse is fine.
- **Error states**: use the same 2px red callout pattern as the urgent ticket, with a red stamp saying `ERROR`.

---

## State Management

Unchanged. Keep all existing stores, hooks, and queries. The redesign is a view-layer refactor.

Mock data used in the prototype (see `reference/mockdata.jsx`) is purely illustrative — the real screens pull from the existing endpoints.

---

## Do / Don't

**Do:**
- Use Fraunces italic for every screen title, no exceptions.
- Use JetBrains Mono for every number that represents a quantity of something (bag counts, counts, IDs, durations). Inter never holds a number on this system.
- Alternate stamp rotations row-to-row (-3° / +3°) for rhythm.
- Keep corners square. Radius 0 everywhere except where physically unavoidable (e.g. native system modals you can't style).
- Use hard 1px offset shadows only. No blur.

**Don't:**
- Don't add gradients, glassmorphism, or blur effects.
- Don't add emoji or stock illustrations.
- Don't introduce colors outside the token list. If you need a new accent, extend the tokens file and document why.
- Don't soften the aesthetic "because it feels too harsh on first impression" — the harshness is the point. It wears in, not off.
- Don't replace the stamp component with a filled pill; the outline + rotation is the entire signature of the direction.

---

## Files in This Bundle

- `README.md` — this document
- `reference/direction-b.jsx` — core screens 1–4 (Dashboard, Stock Manager, Stock Staff, Requests)
- `reference/direction-b-extras.jsx` — screens 5–9 (Place Order, Request Detail, Stock Take, Transfer, More)
- `reference/direction-b-login.jsx` — screen 10 (ledger variation is the spec)
- `reference/wp-primitives.jsx` — **shared Wave-3 primitives (use this as the base for every new screen)**
- `reference/wp-trips.jsx` — screens 11–13 (Trips list, Trip detail, New trip)
- `reference/wp-loans.jsx` — screens 14–16 (Loans list, Loan detail, New loan)
- `reference/wp-utility.jsx` — screens 17–19 (Notifications, Settings, Scan permission)
- `reference/wp-mgmt.jsx` — screens 20–27 (Drivers, Users, Vehicles, Locations, Zones, Suppliers, Driver record, Invite driver)
- `reference/wp-reports.jsx` — screens 28–32 (Reports hub, Stock movement, Orders, Losses, Trips report)
- `reference/icons.jsx` — inline SVG icon set
- `reference/mockdata.jsx` — illustrative data (not for production)
- `reference/ios-frame.jsx` — device frame for the mock canvas; ignore for implementation
- `Stock - Design Exploration.html` — canvas of screens 1–4
- `Stock - Extras.html` — canvas of screens 5–9
- `Stock - Login.html` — login canvas (three variations)
- `Stock - Wave 3.html` — canvas of screens 11–32 with labels

---

## PART II — Wave 3: Trips, Loans, Utilities, Management, Reports

All screens in Part II share a small set of primitives defined in `reference/wp-primitives.jsx`. **Implement these primitives first** as real React Native components in `src/ui/warehousePaper/` (or equivalent) — every Part II screen is a thin composition on top of them. If you find yourself repeating styles across screens, you're doing it wrong.

### Shared Primitives (`reference/wp-primitives.jsx`)

These are the building blocks. The API given in the JSX IS the contract — match it exactly when porting.

| Primitive | Props | What it renders |
| --- | --- | --- |
| `WMasthead` | `kicker`, `title`, `back?`, `right?` | 52/20/14 top-padding header with mono kicker (9pt, 2px tracking, `ink3`) and Fraunces italic 36–44pt 900 title, optional back arrow on the line above the kicker, optional right slot for a small mono outlined pill (e.g. `+ NEW`, `EXPORT`, `MARK ALL`). Bottom rule `1.5px solid lineD`. |
| `WStamp` | `c`, `children`, `rotate?` | The stamp component from Part I. Alternate `rotate` -3°/+3° across list rows. |
| `WIntentStrip` | `children` | Explainer card: `1px solid lineD`, bg `#F6F1E2`, hard shadow `1px 1px 0 lineD`, 12px padding, 3px-wide solid `ink` bar on the left, Fraunces italic 13pt copy to its right. Top/side margin 14/20. |
| `WFieldBox` | `label`, `right?`, `children` | Form field: 14×20 padding, dashed bottom rule, mono 11pt 1px-tracked label, optional right mono 10pt annotation (`AUTO-ASSIGN`, etc.), body slot. |
| `WPrimaryBar` | `label`, `color?` | Fixed sticky bottom action: 10/20/22 padding, top 1.5px `lineD` rule, bg `paper`. Inside: 54px button, bg `color` (default `ink`), paper text, 2px solid `lineD`, hard shadow `3px 3px 0 lineD`, mono 13pt 700 2-letter-spaced. |
| `WBottomTabs` | `active` | 80px bottom nav from Part I, exported here for Wave-3 screens. |
| `WVoucher` | `n`, `title`, `sub`, `qty?`, `qtyLabel?`, `stamp?`, `stampColor?`, `stampRotate?`, `stub?` | The canonical ticket/voucher card: 1px `lineD`, bg `voucherBg`, 1×1 hard shadow, optional 36px-wide left stub column with `N°` + number separated by a dashed rule. Right side holds optional Fraunces italic 900 quantity and optional stamp. |
| `WLedgerRow` | `idx?`, `primary`, `secondary?`, `trailing?`, `onChev?`, `status?`, `statusColor?` | Ledger table row: optional 2-digit zero-padded mono index, Fraunces italic 700 17pt primary, mono 10pt 1px-tracked uppercase secondary, optional trailing slot (stamp or widget), optional colored mono status text, chevron. |
| `WSummaryBand` | `items: [{k, v, color?}]` | N-cell horizontal stats band with mono 22pt 700 numbers and mono 9pt 1.5-tracked uppercase labels; 1px `line` vertical dividers, 1.5px `lineD` bottom rule. Used on Trips, Loans, Reports. |
| `WChipStrip` | `items`, `active` | Period-selector chip row: 10/20 padding, flex-1 chips, mono 10pt 600 1.5-tracked uppercase. Active fills `ink` with paper text; inactive is outlined with `1.5px solid lineD`. |
| `WTabStrip` | `items: [{k,label,count?}]`, `active` | Horizontal tabs: equal flex, mono 11pt, active 700 with 3px solid `ink` underline (margin-bottom -1.5px so it sits flush with masthead rule), inactive 500 `ink3`. |
| `WToggle` | `on` | Paper-native switch: 44×22 outer `1.5px solid lineD`, inner 14×14 inverted block slides from left 2px to left 24px. `ink` fill when on. |
| `WTickerBar` | `cells?`, `filled?`, `color?`, `height?` | Cell-by-cell progress strip (default 10 cells). Used as progress bar and as chart cell. |
| `WMonoInput` | `label`, `value`, `placeholder`, `right?`, `mono?` | Dashed-rule text input: mono label top, value row underlined with `1.5px solid lineD`. Empty shows Fraunces italic 16pt `ink3` placeholder; filled shows mono (or sans) 15pt 600 `ink`. |
| `WActionStack` | `actions: [{label, filled?, color?, shadow?}]` | Vertical button stack with 10px gap: each 1.5px solid border, transparent by default, filled when `filled: true`, paints in `color` (default `ink`). Shared `1×1` hard shadow unless `shadow: false`. |

**Additionally (Wave-3 only):** `WPaperChart({ series, max, height? })` in `reference/wp-reports.jsx` — a paper-native bar chart where each bar is a 1px-bordered rectangle with a mono value label above and a mono day/week label below, all inside a `1.5px solid lineD` card. Use it for every chart in Reports; do **not** pull in a charting library.

### Token additions

Part I tokens cover everything. Two values used repeatedly in Part II that were implicit in Part I:

- `voucherBg` is referenced across trip/loan cards, vehicle-picker fields, date-stamp fields, and the staff-record voucher — make sure it's exported from the theme.
- Accent color `#5B2CA5` (purple) is used for in-transit / in-delivery statuses. Add as `inTransit` or reuse the existing `accepted` token; both map to the same hex.

### fmtDateB() helper

Every masthead kicker includes a date. All screens use the same helper:

```ts
export const fmtDateB = () =>
  new Date()
    .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase(); // "18 FEB 2025"
```

Put it in a shared `utils/date.ts` and import everywhere.

---

### Screen 11 — Trips List (`W_TripsList`)

**Who**: dispatcher / location manager.
**What they need**: see everything on the road, spot the next thing to plan, jump into a new trip.

**Compose:**

1. `WMasthead` · kicker `DISPATCH LOG — {fmtDateB()}`, title `Trips`.
2. `WSummaryBand` · four cells: `ACTIVE` (3), `DONE THIS WK` (12), `THIS MO` (48), `CANCEL` (2, red).
3. `WTabStrip` · `ACTIVE 3` / `COMPLETED 45` / `ALL`.
4. **Search + New row**: flex row, 14×20 padding. Left: flex-1 "search field" — bottom border 1.5px `lineD`, ⌕ glyph in mono 12pt `ink3` on the left, Fraunces italic 14pt `ink3` placeholder `trip # · reg · driver`. Right: a mono-pill `+ NEW` (1.5px solid `lineD`, 7×12 padding, mono 10pt 700 1.5-tracked).
5. **Active section**: kicker row (`ON THE ROAD` / `3 TRIPS`), then voucher cards with a 36px `N° {4-digit}` stub. Body holds `{from}` → `{to}` in Fraunces italic 15pt 700 with a mono `→` divider; sub line mono 9pt uppercase `{reg} · {driver} · {time} AGO`; right-side `WStamp` with status color (`IN TRANSIT` → purple, `PLANNED` → amber). 10px vertical gap between cards.
6. **Completed section**: top rule 1.5px `lineD`, kicker `COMPLETED · THIS WEEK`. Same voucher cards, opacity 0.75.
7. `WBottomTabs active="trips"`.

### Screen 12 — Trip Detail (`W_TripDetail`)

1. `WMasthead` back · kicker `TRIP · N°1043 · 20 APR 2026`, title `Dispatch record`.
2. **Hero voucher** (raw card, not `WVoucher` — it's denser): 14×16 padding, top row `VOUCHER N° {id}` kicker + `IN TRANSIT` stamp. Below: Fraunces italic 900 **72pt** number (tracking -3, lh 0.9) + mono 11pt `BAGS PLANNED`. Then a dashed-rule mini-ledger with: `ROUTE`, `VEHICLE`, `DRIVER`, `DEPARTED`, `ARRIVED` (key mono 10pt `ink3` 1.5-tracked, value Inter 13pt 600 right-aligned).
3. **Stops section**: kicker + `TICKER` label, then a 3-cell `WTickerBar filled=1`. Each stop is a row: 22px zero-padded index, `PICKUP`/`DROPOFF` stamp + Fraunces italic 16pt 700 location, mono `PLANNED {n} · ACTUAL {n}` sub-line, right-side status stamp (`DONE` green · `NEXT` red · `WAITING` ink3).
4. `WActionStack` · `DELIVER NEXT STOP →` (filled), `EDIT TRIP`, `CANCEL TRIP` (red).

### Screen 13 — New Trip (`W_TripCreate`)

1. `WMasthead` back · `NEW TRIP — {date}`, title `Plan a trip`.
2. `WIntentStrip` · `Create a trip to move stock between locations. Pick a vehicle, set the route, add notes.`
3. `WFieldBox label="Trip type"` · 2×2 grid of tiles. Active tile: ink bg + paper text + `2×2 0 lineD` shadow. Each tile has a mono 9pt 1.5-tracked code (`W→S`, `S→S`, `SUP→W`, `S→W`) on top and Fraunces italic 14pt 700 label below.
4. `WFieldBox label="Vehicle"` · `1.5px solid lineD` container with rows. Each row: 14×14 checkbox (filled ink + paper `✓` when selected), mono 13pt 700 1-tracked plate, mono 9pt 1.2-tracked model & capacity sub-line. Selected row bg `rgba(26,25,22,0.05)`.
5. `WFieldBox label="Driver" right="AUTO-ASSIGN"` · Fraunces italic 17pt name, mono 10pt `ACTIVE · LICENSE OK` sub.
6. `WFieldBox label="From"` / `label="To"` · Fraunces italic 900 18pt location each.
7. `WFieldBox label="Notes · optional"` · `1.5px solid lineD` textarea with voucher bg, Fraunces italic 14pt `ink3` placeholder.
8. `WPrimaryBar label="CREATE TRIP →"`.

### Screen 14 — Loans List (`W_LoansList`)

1. `WMasthead` back · `LOAN LEDGER — {date}`, title `Loans`.
2. `WSummaryBand` · `ACTIVE` (4), `AWAITING RETURN` (2, amber), `COMPLETED` (87, ink3).
3. `WTabStrip` · `BORROWING 2` / `LENDING 2`.
4. **Loan voucher cards**, 10px gap: same 36px `N° {id}` stub as trips. Body: `{lender} ↔ `{borrower}` in Fraunces italic 15pt 700 with mono `↔` divider. Right side: Fraunces italic 22pt 900 quantity + mono `BAGS` label + stamp.

Status palette:
- `PENDING` amber · `IN TRANSIT` purple (#5B2CA5) · `ACTIVE` green · `RETURN DUE` amber.

### Screen 15 — Loan Detail (`W_LoanDetail`)

1. `WMasthead` back · `LOAN · N°0212 · 17 APR 2026`, title `Loan record`.
2. **Hero voucher** with `VOUCHER N° {id}` + `ACTIVE` green stamp, Fraunces italic 900 84pt qty + mono `BAGS`, dashed ledger rows: `BORROWER`, `LENDER`, `REQUESTED`, `APPROVED`, `EST. RETURN`, `ACTUAL RETURN`.
3. **Progress section**: kicker `PROGRESS — STEP {current} / {total}`, a 9-cell `WTickerBar` (height 10) with paper-gap separators. Below: three mono 8pt 1-tracked labels — first step `ink3`, current step `ink` 700, last step `ink3`.

Stages (for the bar): `PENDING → ACCEPTED → CONFIRMED → IN TRANSIT → COLLECTED → ACTIVE → RETURN INIT → RETURN WIP → DONE`.

4. `WActionStack` · `INITIATE RETURN →` (filled), `EDIT LOAN`, `CANCEL LOAN` (red).

### Screen 16 — New Loan (`W_LoanCreate`)

1. `WMasthead` back · `NEW LOAN — {date}`, title `Borrow stock`.
2. `WIntentStrip` · `Request bags from another location. They'll approve or decline; once approved, a driver delivers to you.`
3. `WFieldBox label="Lender location"` · framed `1.5px solid lineD` list. Each row: 14×14 checkbox, Fraunces italic 16pt 700 location, mono 9pt right-aligned `{n} ON HAND`. Selected row bg `rgba(26,25,22,0.05)`.
4. `WFieldBox label="Quantity · bags"` · Fraunces italic 900 52pt number + mono `/ 1,060 available`. Below: 4 quick chips (`10 / 20 / 50 / 100`), flex-1, mono 11pt 1-tracked, 1.5px `lineD` border, active one inverts (ink bg / paper text).
5. `WFieldBox label="Estimated return"` · paper-native date scroller: `1.5px solid lineD` container with three flex columns (`DAY 25 · MONTH APR · YEAR 2026`), each column has mono 9pt 1.5-tracked label on top and mono 22pt 700 value below, separated by `1.5px solid lineD` vertical rules.
6. `WFieldBox label="Notes · optional"` · textarea.
7. `WPrimaryBar label="REQUEST 50 BAGS →"`.

### Screen 17 — Notifications (`W_Notifications`)

1. `WMasthead` back · `MAIL ROOM — {date}`, title `Notifications`, right slot: `MARK ALL` mono pill.
2. Section header: `TODAY` kicker + `{n} ENTRIES` counter. Bottom 1.5px `lineD` rule.
3. Each notification is a row with a **3px-wide colored spine** on the left (`red` for critical, `amber` for warning, `ink3` for info). Body: Fraunces italic 15pt 700 title, Inter 12pt `ink2` body (1.4 line-height). Right: mono 9pt 1-tracked `{t} AGO` timestamp.
4. Section break: 1.5px `lineD` rule, then `YESTERDAY` kicker + count.

### Screen 18 — Settings (`W_Settings`)

1. `WMasthead` back · `PREFERENCES — {date}`, title `Settings`.
2. Grouped sections — each group has a 1.5px `lineD` top rule and a kicker header (`NOTIFICATIONS`, `GENERAL`, `ACCOUNT`).
3. Each row: 14×20 padding, dashed bottom. Left flex: Fraunces italic 16pt 700 label. Right: either `WToggle`, a mono 12pt 600 value + chevron, or a bare chevron.
4. Row sets:
   - **Notifications**: Push notifications (toggle on), Threshold alerts (toggle on), Daily summary time `07:00` (chev).
   - **General**: Language `EN` (chev), Clear cache (chev).
   - **Account**: Sign out (chev).
5. Below all groups, centered: `DELETE ACCOUNT` button — red bg, paper text, 1.5px solid `red`, 12×24 padding, mono 11pt 700 2-tracked, hard `1×1 lineD` shadow.
6. Footer: centered mono 9pt 1.5-tracked `POTATO STOCK · v1.0.0`.

### Screen 19 — Scan Permission (`W_ScanPermission` + illustrated variant `W_ScanPermissionV2`)

Two options ship in reference; **production should use `W_ScanPermissionV2`** — the illustrated paper-camera version. The plain one (`W_ScanPermission`) stays only as a lighter-weight alternative.

`W_ScanPermissionV2` layout:

1. Kicker `FIELD OPS · SCANNER` + Fraunces italic 900 32pt title `We need the camera.` (no masthead rule — this is a modal-feeling screen).
2. **Paper-camera illustration**: 220×160 rectangle, 1.5px solid `lineD`, voucher bg, hard `3×3 lineD` shadow. Inside: mono 9pt 1.5-tracked `PERMIT N° 04-CAM` at the top, then a 1.5px solid `lineD` inset rectangle containing a concentric circle (64px outer / 28px inner, both 2px solid `ink`, rounded). Top-right: a `PENDING` red stamp tilted 8°.
3. Body copy: Fraunces italic 16pt 1.5-lh.
4. **Use-for panel**: 1.5px solid `lineD` card. Kicker `WE USE IT FOR`, three bulleted mono rows: `Scanning bags during stock take`, `Confirming deliveries on trips`, `Reading batch numbers from suppliers`.
5. Action buttons — stacked:
   - `ALLOW CAMERA →` (54px, ink bg, paper text, 2px solid `lineD`, `3×3 lineD` shadow, mono 13pt 700 2-tracked).
   - `NOT NOW` (44px, transparent, 1.5px solid `lineD`, mono 11pt 600 1.5-tracked).
6. Footer helper: centered mono 9pt 1.2-tracked `YOU CAN CHANGE THIS LATER IN SETTINGS`.

---

### Management — one shared list template

Screens 20–25 (Drivers / Users / Vehicles / Locations / Zones / Suppliers) **share a single component template** (`MgmtList` in `wp-mgmt.jsx`). Do the same in production: one `<ManagementList>` that takes a kicker, optional `WTabStrip` filters, and a row schema `{ name, sub, status, statusColor }`. Never duplicate list markup per entity.

Row anatomy (all six screens):

- 14×20 padding, dashed bottom rule.
- 22px zero-padded mono index.
- Flex primary: Fraunces italic 17pt 700 name.
- Mono 10pt 1-tracked uppercase sub-line.
- `WStamp` with entity-specific color.
- Mono 14pt `›` chevron.

Per-screen copy & rows (exact content in the reference JSX):

| # | Screen | Kicker | Filters |
| --- | --- | --- | --- |
| 20 | Drivers | `DRIVER ROSTER — {date}` | `ALL 12 / ACTIVE 9 / PENDING 2 / EXPIRED 1` |
| 21 | Users | `STAFF ROSTER — {date}` | `ALL 18 / ADMIN 2 / MANAGER 6 / STAFF 10` |
| 22 | Vehicles | `FLEET ROSTER — {date}` | none |
| 23 | Locations | `LOCATIONS ROSTER — {date}` | none |
| 24 | Zones | `ZONES ROSTER — {date}` | none |
| 25 | Suppliers | `SUPPLIERS ROSTER — {date}` | none |

Status palette by entity:
- Drivers: `ACTIVE` green · `EXPIRING` amber · `PENDING` amber · `EXPIRED` red.
- Users: `ACTIVE` green · `PENDING` amber.
- Vehicles: `ON TRIP` purple · `IDLE` green · `SERVICE` amber.
- Locations: `OK` green · `LOW` amber · `CRITICAL` red.
- Zones: `ACTIVE` green · `NO MGR` amber.
- Suppliers: `ACTIVE` green · `INACTIVE` ink3.

Every management list has a right-slot `+ NEW` pill in the masthead that routes to the matching create screen.

### Screen 26 — Driver Record (`W_DriverDetail`) — exemplar for all entity detail pages

Implement once; reuse the shape for User, Vehicle, Location, Zone, Supplier by just swapping labels + rows. Layout:

1. `WMasthead` back · kicker `DRIVER · {NAME INITIAL}.`, title `Driver record`.
2. **ID voucher card** (14×16 padding, `1px solid lineD`, voucher bg, `1×1 lineD` shadow):
   - Top row: 48×58 initial square (ink bg, paper text, Fraunces italic 24pt 900), flex name block — kicker `RECORD N° DRV-044` + Fraunces italic 22pt 900 name — right-side `ACTIVE` green stamp rotated 3°.
   - Dashed divider, then 6 key/value rows: `PHONE / EMAIL / LICENSE / EXPIRES / HOME LOC / JOINED` (key mono 10pt `ink3` 1.5-tracked, value mono 12pt 600 0.5-tracked).
3. **Recent trips panel**: kicker `RECENT TRIPS`, 1.5px `lineD` box. Two rows separated by dashed rule: `THIS WEEK` → `6 trips · 1,840 bags`; `THIS MONTH` → `24 trips · 7,230 bags`.
4. `WActionStack`: `EDIT RECORD` (filled), `RESEND INVITATION`, `DEACTIVATE` (amber), `DELETE DRIVER` (red).

**Parity table** — for the other detail screens, reuse the exact same layout and change only:

| Entity | Record ID | Meta rows | Side panel |
| --- | --- | --- | --- |
| User | `USR-xxx` | Role / Email / Phone / Location / Joined / Last seen | Recent activity (logins, edits) |
| Vehicle | `VEH-xxx` | Plate / Model / Capacity / Fuel / Home loc / Current driver | Trips this month (count, bags, km) |
| Location | `LOC-xxx` | Type / Zone / Manager / Min stock / Current stock / Staff count | Recent movement (in, out, waste) |
| Zone | `ZON-xxx` | Manager / Locations in zone / Total stock / Total staff | (skip) |
| Supplier | `SUP-xxx` | Contact / Phone / Email / Lead time / Rating | Recent batches (last 3) |

### Screen 27 — Invite Driver (`W_DriverCreate`) — exemplar for all entity create pages

Layout template for every "create / invite" form:

1. `WMasthead` back · kicker `NEW DRIVER — {date}` (adjust per entity), title `Invite a driver`.
2. `WIntentStrip` · explainer one-liner.
3. A stack of `WMonoInput` fields. For drivers: `Full name` (sans), `Email`, `Phone`, `License number`.
4. Any date field uses the **3-column paper date scroller** pattern (see loan create). Per-column: mono 9pt label, mono 22pt 700 value, `1.5px lineD` vertical rules, voucher bg.
5. `WFieldBox` for any pre-selected reference like "Home location" — show Fraunces italic 900 18pt value.
6. `WPrimaryBar` labelled `SEND INVITATION →` (or `CREATE {ENTITY} →`).

Reuse the same field grammar for: invite user, add vehicle, add location, add zone, add supplier. Only the field list changes.

---

### Screen 28 — Reports Hub (`W_ReportsHub`)

1. `WMasthead` · `STATISTICS DEPT — {date}`, title `Reports` (no back — this is reached via the More menu).
2. `WChipStrip` · `WEEK / MONTH / QUARTER / YEAR`, `active="MONTH"`.
3. `WSummaryBand` · `BAGS MOVED 24.3K`, `ORDERS 312`, `SHRINK 1.8%` (amber).
4. Kicker `REPORT LIBRARY`, then 6 `WLedgerRow`s:
   - `01 Stock movement` / `Transfers, receipts, adjustments` / trailing `MVT` pill.
   - `02 Orders` / `Volume by zone, fulfillment rate` / `ORD`.
   - `03 Losses` / `Shrink, damage, variance` / `LOS`.
   - `04 Trips` / `Driver output, on-time %` / `TRP`.
   - `05 Suppliers` / `Batches in, quality flags` / `SUP`.
   - `06 Locations` / `Stock level, throughput` / `LOC`.
5. The trailing pill is: mono 9pt 1.5-tracked, 1px `lineD` border, 3×7 padding — looks like a newspaper section tag.

### Screen 29 — Stock Movement Report (`W_ReportMovement`)

1. `WMasthead` back, right slot `EXPORT` pill. Kicker `STATISTICS · MOVEMENT — {date}`, title `Stock movement`.
2. `WChipStrip` `7D / 30D / 90D / YTD`.
3. `WSummaryBand` · `BAGS IN 3,110` (green), `BAGS OUT 2,840` (red), `NET +270`.
4. Kicker `BY DAY — BAGS MOVED`, then `WPaperChart` with 7 weekday bars (`MON…SUN`), one bar highlighted `amber` for peak (`FRI 710`).
5. Kicker `TOP ROUTES`, three `WLedgerRow`s with trailing mono 12pt 700 percentage (`34% / 21% / 15%`).

### Screen 30 — Orders Report (`W_ReportOrders`)

1. Masthead · `STATISTICS · ORDERS`, `Orders`. Right `EXPORT` pill.
2. `WChipStrip` `WEEK / MONTH / QUARTER / YEAR`, default `MONTH`.
3. `WSummaryBand` · `PLACED 312`, `FULFILLED 94%` (green), `AVG / DAY 10`.
4. Kicker `ORDERS PLACED · BY WEEK`, `WPaperChart` with 4 weekly bars (`W1..W4`), `W4` highlighted green.
5. Kicker `BY ZONE`, three `WLedgerRow`s with a trailing 96px-wide `WTickerBar` (10 cells, filled 7/5/2) and a right-side mono 10pt number.

### Screen 31 — Losses Report (`W_ReportLosses`)

1. Masthead · `STATISTICS · LOSSES`, `Losses`. Right `EXPORT` pill.
2. `WChipStrip` `WEEK / MONTH / QUARTER / YEAR`.
3. `WSummaryBand` · `SHRINK % 1.8%` (amber), `BAGS LOST 438` (red), `VS. PREV −0.4%` (green).
4. Kicker `CAUSES — SHARE OF LOSS`, 4 rows (Damage / Variance / Theft / Spoilage). Each row: Fraunces italic 16pt 700 label (110px wide), flex `WTickerBar` (filled proportional — 8/6/3/2), right-aligned mono 12pt 700 percentage (42% / 31% / 15% / 12%). Ticker bar color matches the severity palette.
5. Kicker `RECENT INCIDENTS`, two `WLedgerRow`s with right-side mono status text in green/amber.

### Screen 32 — Trips Report (`W_ReportTrips`)

1. Masthead · `STATISTICS · TRIPS`, `Trips`. Right `EXPORT` pill.
2. `WChipStrip` `WEEK / MONTH / QUARTER / YEAR`, default `WEEK`.
3. `WSummaryBand` · `TRIPS 42`, `ON TIME 88%` (green), `AVG KM 74`.
4. Kicker `DRIVER OUTPUT — BAGS MOVED`, 4 rows — Fraunces italic 16pt name, flex `WTickerBar` (10 cells, filled proportional 9/7/6/4), right-aligned mono 12pt 700 bag count.

---

### Implementation Order (recommended)

1. Drop `reference/wp-primitives.jsx` into the project as a spec, then port each primitive to real React Native in `src/ui/warehousePaper/` and unit-test with Storybook. Every primitive is ~30–80 LOC.
2. Build `W_TripsList` (screen 11) **first** — it exercises every primitive except the chart and the ticker. If the primitives are right, this screen composes in under 80 lines.
3. Build `W_DriverDetail` and `W_DriverCreate` — these are the templates for all 6 entity detail/create pairs. Once those land, the remaining 10 management screens are copy-swap-labels.
4. Reports last — they need `WPaperChart` which is new. Scope that component to take a simple `{ series: [{l, v, c?}], max }` API.

### Do / Don't (additions)

**Do:**
- Build the `MgmtList` template once; never duplicate list markup per entity type.
- Use `WPaperChart` for every chart in the app; if you hit a case it can't express, propose an extension rather than reach for a charting library.
- The status stamp on every list row is a live signal — hook it up to the real data's status enum.

**Don't:**
- Don't add modal dialogs for list filtering; the `WChipStrip` + `WTabStrip` combination is the entire filter grammar.
- Don't add icon glyphs inside the `WLedgerRow` primary slot — it's italic serif text, nothing else. Trailing slot is where glyphs live.
- Don't animate the `WTickerBar` fills on mount — they should render instantly to reinforce the "printed ledger" feel.

---

Open `Stock - Design Exploration.html` (1–4), `Stock - Extras.html` (5–9), `Stock - Login.html` (10), and `Stock - Wave 3.html` (11–32) for every rendered screen.

---

## Questions for the Designer

If anything is ambiguous during implementation, surface it — don't guess. Specifically:
- Exact Fraunces licensing (Google Fonts is fine for prototyping, production may need a paid weight).
- Whether the paper texture should be a static asset (PNG/SVG) or generated with the CSS recipe on every device.
- Whether the stamp rotation should be purely presentational or reflect age/priority of the record.
- Dark-mode strategy — this direction is designed light-only. If dark mode is required, propose a separate exploration rather than inverting.
