# Design Brief — Outstanding Pages for "Warehouse Paper" Mobile App

> **For: Claude Design** (or any designer taking this forward)
> **App:** Potato Stock Tracking — multi-tenant inventory management for a food franchise (shops, warehouses, delivery fleet)
> **Platform:** React Native + Expo (iOS + Android, targeting iOS first)
> **Design system:** "Warehouse Paper" — editorial ledger aesthetic (warm paper, black ink, Fraunces italic display, JetBrains Mono data, outlined stamps, hard 1px shadows, zero border-radius)

This document catalogues every remaining screen in the mobile app that **does not yet have a warehouse-paper mock** but needs one. Your task is to produce mocks (HTML/JSX or Figma-equivalent) for each so they feel unmistakably of the same system as the already-designed Stock, Requests, Dashboard, and More screens.

---

## Section 1 — Design system context you must reuse

These tokens, primitives, and patterns already exist in the codebase. New mocks MUST compose from them — do not introduce new tokens, shadow styles, or typography scales without explicit reason.

### Color tokens
```
paper       #ECE6D6   App background, tab bar bg
paperAlt    #E3DCC8   Subtle panel tint, skeleton rows
voucherBg   #F6F1E2   Ticket/card bg (slightly lighter than paper)
ink         #1A1916   Primary text, primary borders, active tab
ink2        #5A5651   Secondary text
ink3        #8F8A7F   Tertiary text, labels, metadata, chevrons
line        #C9C0A8   Dashed dividers, subtle borders
lineD       #1A1916   Strong borders (masthead underline, ledger header rule)
red         #C23B1F   Stamp red, critical stock, destructive actions
amber       #C67F00   Low-stock warning, pending status
green       #3B7A3A   Healthy stock, positive state, confirmed
tape        #E6D486   Masking-tape accent
```

Pipeline state colors:
- `accepted → #1F3A8A`
- `in_delivery → #5B2CA5`
- `trip_created → #3B7A3A`

### Typography
- **Fraunces italic 700 / 900** — screen titles, hero quantity numbers, italic row titles (e.g. "Harrismith", menu entry names in the Back Office)
- **Inter 400 / 500 / 600 / 700** — body text, row titles, button labels where not uppercase
- **JetBrains Mono 400 / 500 / 600 / 700** — all numbers that represent a quantity, dates, IDs, kickers (uppercase), stamp text, tab labels
- Italic serif (Georgia fallback) for body-italic copy in IntentStrip — 13pt

### Rules (invariant — do not break)
- Zero border-radius anywhere
- Stamps are outlined (1.5px border, transparent bg), never filled pills
- Only one shadow style: hard 1×1 offset ink (`1px 1px 0 #1A1916`) — no blur
- Row dividers inside lists are **inset** (live inside the 20px horizontal screen padding, not touching screen edges)
- Only the masthead bottom border and ledger column-header rule are full-bleed
- Screen horizontal padding: 20px throughout
- Vertical rhythm: 8 / 12 / 14 / 18 / 22 / 28px (don't invent other values)
- Stamps alternate rotation row-to-row: even index +3°, odd -3° (acceptable range -4° to +4°)
- No gradients, no blur, no emoji, no illustrations

### Existing primitives to reuse (already built in `apps/mobile/src/components/wp/`)
- `PaperBackground` — screen root wrapper (paper color + hairlines + top vignette)
- `Masthead` — kicker line + italic Fraunces title + optional back arrow
- `Stamp` — outlined status pill with rotation
- `MonoText` — JetBrains Mono text (any weight)
- `SerifNumber` — Fraunces italic for quantities (700 or 900, auto-shrink for long values)
- `KickerLabel` — uppercase mono label
- `HardShadowFrame` — wraps any element with a hard 1×1 offset ink shadow
- `FloatingFrameLabel` — the "FORECAST" / "URGENT TICKET" cutout label
- `TapeAccent` — masking-tape rectangle accent
- `InkButton` — outlined or solid-ink square button, uppercase mono label
- `IntentStrip` — quote-block explainer card (3px ink rule + italic serif copy)
- `DFieldBox` — form field (mono uppercase label + 8px gap + content + dashed bottom rule)
- `PrimaryBar` — sticky bottom 54px ink button with 3×3 shadow
- `TickerProgressBar` — 20-cell progress bar for stock take
- `VoucherCard` — request ticket card with N° stub, dashed perforation, quantity, stamp
- `KitchenStampButton` — staff withdraw stamp-button replacement for FAB

### Layouts already shipped (reference)
See `apps/design_handoff_stock_warehouse_paper/reference/direction-b.jsx` and `direction-b-extras.jsx` for the full JSX source of the 9 already-designed screens. New mocks should visually be in that same family.

---

## Section 2 — Outstanding pages (30 screens)

Grouped by flow. For each, the brief lists the **path**, **users**, **purpose**, **key data**, and **my suggested warehouse-paper approach** as a starting point. Feel free to propose better.

### 2.1 — Primary navigation — TRIPS tab (priority: **P1**)

The fourth top-level tab. Visible in the bottom tab bar but currently renders in its own warm-beige pre-warehouse-paper style. Without a mock here the redesign has a clearly visible "odd tab."

| # | Path | Purpose | Users |
|---|---|---|---|
| 1 | `apps/mobile/app/(tabs)/trips.tsx` | List of all trips — active, completed, searchable, grouped by date for completed | driver, vehicle_manager, admin, zone_manager |

**Current screen elements to preserve:**
- Search bar (trip number, origin, destination, vehicle reg, driver name)
- Three-tab filter: Active / Completed / All (with counts)
- Section-list with date grouping on Completed tab (Today / This week / This month / Older)
- FAB for managers to create a new trip
- Trip card per row showing: route arrow, trip number, vehicle reg, timestamp, status

**Suggested warehouse-paper treatment:**
- Masthead: kicker `DISPATCH LOG — {date}`, title `Trips` (Fraunces italic 38pt)
- Summary band with 3–4 counts: `Active / Completed / This wk / This mo` (mono 22pt 700, 10pt kickers)
- Tab strip with 3px ink underline for active (matching Stock Take pattern)
- Search as an underlined mono text input
- **Trip voucher card** — new variant of the request voucher:
  - N° stub column with trip number last 4 chars
  - Dashed vertical perforation at left:42px
  - Route: `{origin} → {destination}` (Fraunces italic 17pt for origin/dest with mono arrow)
  - Meta: `{vehicle reg} · {driver} · {time ago}` in mono 10pt ink3
  - Right: stamp with status (`PLANNED` amber / `IN TRANSIT` blue-purple / `DONE` green / `CANCELLED` ink3)
- FAB removed; replace with inline `+ NEW TRIP` InkButton above the list for managers
- Section headers on Completed: solid 1.5px top border ink, mono kicker left, count right

---

### 2.2 — Trip flow (priority: **P1**)

Driver workflow — accept request → create trip → drive → complete stops → submit KM. These are core to the business flow.

| # | Path | Purpose | Users |
|---|---|---|---|
| 2 | `apps/mobile/app/trip/[id].tsx` | Trip detail with stops list, start/complete actions, KM submit form | driver, manager |
| 3 | `apps/mobile/app/trip/create.tsx` | Manager creates a new trip — pick vehicle, driver, trip type, from/to, notes | admin, zone_manager, vehicle_manager, location_manager |

**Screen 2 — Trip detail, current elements to preserve:**
- Status badge (planned / in_progress / completed / cancelled)
- Route (origin → destination)
- Vehicle + driver info
- Departure + completion timestamps
- Stops list (each stop has type pickup/dropoff, location, planned qty, actual qty when completed)
- Driver actions: Start trip, Complete a pickup stop, Deliver at dropoff (→ navigates to delivery scanner)
- Manager actions: Cancel trip, Complete trip
- KM submit form when trip is completed but odometer end is missing

**Suggested warehouse-paper treatment:**
- Masthead: kicker `TRIP · {number} · {date}`, title `Dispatch record`, back arrow
- **Trip voucher hero** (similar to request detail but trip-themed):
  - Top row: `VOUCHER N° {trip_number}` kicker + status Stamp
  - Big Fraunces italic number: total planned bags across stops (or actual when complete)
  - Meta ledger rows: `VEHICLE`, `DRIVER`, `DEPARTED`, `ARRIVED`
- Ledger-style stops list: "STOPS — X/Y COMPLETE" header, each stop a row with:
  - Stop number (mono 10pt ink3)
  - Pickup/Dropoff type as tiny Stamp
  - Location (Fraunces italic 16pt)
  - Planned qty / actual qty if counted (mono 14pt)
  - Stamp: `DONE` / `NEXT` / `WAITING`
- Action stack at bottom (outlined ink for actions, red outline for Cancel — same pattern as request detail)
- KM submit as a DFieldBox at the bottom when applicable, with 56pt Fraunces italic input

**Screen 3 — Create trip, current elements to preserve:**
- Vehicle picker (required) — shows only available vehicles
- Driver picker (optional, auto-assigned by role for some flows)
- Trip type selector (supplier_to_warehouse / warehouse_to_shop / shop_to_shop / etc.)
- From location picker (dynamic based on trip type)
- To location picker
- Notes field
- Submit → creates trip

**Suggested warehouse-paper treatment:**
- Masthead: kicker `NEW TRIP — {date}`, title `Plan a trip`
- IntentStrip: "Create a trip to move stock between locations. Pick a vehicle, set the route, add notes."
- DFieldBox "Trip type" — two-row tile grid (similar to Urgency tiles but 6 choices)
- DFieldBox "Vehicle" — bordered list with radio-style check (similar to Transfer destination list)
- DFieldBox "Driver" — bordered list with checkbox or "Auto-assign" option
- DFieldBox "From / To" — same bordered list pattern
- DFieldBox "Notes · optional" — italic serif textarea
- PrimaryBar: `Create trip →`

---

### 2.3 — Loan flow (priority: **P2**)

Inter-shop loan workflow — a location manager requests bags from another location when short. 8-step state machine.

| # | Path | Purpose | Users |
|---|---|---|---|
| 4 | `apps/mobile/app/loans.tsx` | Loans list — filterable by borrower/lender perspective | location_manager, zone_manager, admin |
| 5 | `apps/mobile/app/loan/[id].tsx` | Loan detail — shows progress through 8 states (pending → accepted → confirmed → in_transit → collected → active → return_initiated → return_in_progress → completed) | borrower/lender location_managers |
| 6 | `apps/mobile/app/loan/create.tsx` | Borrower creates a loan request to a lender location | location_manager |

**Suggested warehouse-paper treatment:**

**Loans list:**
- Masthead: kicker `LOAN LEDGER — {date}`, title `Loans`
- Two-tab strip: `BORROWING` / `LENDING` (showing what you owe vs what's owed to you)
- Summary band: `ACTIVE / AWAITING RETURN / COMPLETED` counts
- Voucher cards per loan, similar to request voucher but distinct stamp set:
  - `PENDING` amber, `APPROVED` blue, `IN TRANSIT` purple, `ACTIVE` green, `RETURN DUE` amber, `COMPLETED` ink3

**Loan detail — the most complex outstanding screen. Should have:**
- Masthead: kicker `LOAN · {id}`, title `Loan record`, back arrow
- Voucher hero: borrower ↔ lender names, quantity in Fraunces italic 88pt, status stamp
- **8-step progress voucher** — variant of `TickerProgressBar`: 8 cells (one per state), filled up to current state. Mono 9pt labels below each cell showing state name.
- Meta ledger: `BORROWER`, `LENDER`, `REQUESTED`, `APPROVED`, `ESTIMATED RETURN`, `ACTUAL RETURN`
- Action stack — actions depend on user role + current state (accept/reject if lender-pending, assign pickup driver if approved, confirm receipt, initiate return, assign return driver, confirm return). Use outlined InkButton stack with red-outlined destructive.

**Create loan:**
- Masthead: kicker `NEW LOAN — {date}`, title `Borrow stock`
- IntentStrip: "Request bags from another location. They'll approve or decline; once approved, a driver delivers to you."
- DFieldBox "Lender location" — bordered list of other locations (like Transfer destination)
- DFieldBox "Quantity · bags" — 56pt Fraunces italic + chips [10, 20, 50, 100]
- DFieldBox "Estimated return date" — date input (see Notes on date picker below)
- DFieldBox "Notes · optional" — italic serif textarea
- PrimaryBar: `Request {n} bags →`

**Note on dates:** The current app uses freeform ISO string inputs which is a known UX weakness. Consider proposing a date-picker pattern in the warehouse-paper style — perhaps a bordered panel with a 3-column mono numeric scroller (DD / MMM / YYYY) with 1.5px dividers, no native platform calendar.

---

### 2.4 — Management screens reachable from *More* tab (priority: **P2**)

These all follow a "list + detail + create" triad. Recommend a **single shared list pattern** (ledger table) and a **single shared detail pattern** (voucher hero + meta ledger + edit fields) to avoid designing 16 unique screens.

#### Drivers (3 screens)

| # | Path | Purpose |
|---|---|---|
| 7 | `apps/mobile/app/drivers/index.tsx` | List of drivers with active/pending/expired invitation status, license expiry flag |
| 8 | `apps/mobile/app/drivers/[id].tsx` | Driver detail — edit license, contact, activate/deactivate, send invitation |
| 9 | `apps/mobile/app/drivers/create.tsx` | Invite a new driver by email |

#### Users (3 screens)

| # | Path | Purpose |
|---|---|---|
| 10 | `apps/mobile/app/users/index.tsx` | List of all users grouped by role |
| 11 | `apps/mobile/app/users/[id].tsx` | User detail — change role, location, deactivate |
| 12 | `apps/mobile/app/users/create.tsx` | Invite new user (email + role + location) |

#### Vehicles (3 screens)

| # | Path | Purpose |
|---|---|---|
| 13 | `apps/mobile/app/vehicles/index.tsx` | List of vehicles with availability (current trip badge if assigned) |
| 14 | `apps/mobile/app/vehicles/[id].tsx` | Vehicle detail — edit registration, make/model, capacity, fuel type, activate/deactivate |
| 15 | `apps/mobile/app/vehicles/create.tsx` | Add new vehicle |

#### Locations (3 screens)

| # | Path | Purpose |
|---|---|---|
| 16 | `apps/mobile/app/locations/index.tsx` | List of locations grouped by zone, with type (shop/warehouse) |
| 17 | `apps/mobile/app/locations/[id].tsx` | Location detail — edit name, address, thresholds (low/critical stock) |
| 18 | `apps/mobile/app/locations/create.tsx` | Create new location |

#### Zones (2 screens)

| # | Path | Purpose |
|---|---|---|
| 19 | `apps/mobile/app/zones/index.tsx` | List of zones with location counts |
| 20 | `apps/mobile/app/zones/[id].tsx` | Zone detail — list locations in zone, assign zone manager |

#### Suppliers (2 screens)

| # | Path | Purpose |
|---|---|---|
| 21 | `apps/mobile/app/suppliers/index.tsx` | List of suppliers |
| 22 | `apps/mobile/app/suppliers/[id].tsx` | Supplier detail — contact info, recent batches received from them |

**Suggested shared pattern for all 16 management screens:**

**List screen:**
- Masthead: kicker `{AREA NAME} ROSTER — {date}`, title `{Area name}` (italic Fraunces 38pt)
- Optional filter tab strip (e.g. Drivers: `ALL / ACTIVE / PENDING / EXPIRED`)
- Summary band if applicable (counts by subtype)
- Ledger rows (the "LedgerRow" primitive pattern used on Back Office):
  - 22px column: 2-digit zero-padded index (mono 10pt ink3)
  - Flex entry: Fraunces italic 17pt 700 name
  - Secondary: mono 10pt ink3 context (e.g. `· WAREHOUSE`, `· LOC-MGR`, license expiry date)
  - Right: Stamp with status (`ACTIVE`, `INACTIVE`, `EXPIRED`, etc.)
  - Trailing chevron
- Inline `+ NEW {noun}` InkButton above the list header (replaces floating FAB)

**Detail screen:**
- Masthead: kicker `{TYPE} · {NAME}`, title `{name}` (italic), back arrow
- Voucher hero card: 1.5px ink border, voucherBg, hard 1×1 shadow
  - Top row: `RECORD N° {id}` kicker + status Stamp
  - Big italic name
  - Meta ledger rows: primary fields (license number, expiry, phone, email, etc.)
- `Stock info` / `Recent activity` panel — 1.5px ink border rectangle with mono stats
- Action stack — `EDIT`, `DEACTIVATE` (amber outline), `DELETE` (red outline + fill for destructive confirmation)

**Create screen:**
- Masthead: kicker `NEW {NOUN} — {date}`, title `Add {noun}`
- IntentStrip with what this does
- Stack of `DFieldBox` form fields
- PrimaryBar: `Create {noun} →`

---

### 2.5 — Reports (priority: **P2**)

Analytics surface. Currently a hub page + 4 report detail pages. Data is mostly tabular + a few bar charts.

| # | Path | Purpose | Key data |
|---|---|---|---|
| 23 | `apps/mobile/app/reports/index.tsx` | Reports hub — period selector, quick stats, 4 report cards, waste summary | Total bags consumed, daily average, trend %, waste rate |
| 24 | `apps/mobile/app/reports/deliveries.tsx` | Delivery performance report | Count of deliveries, avg cycle time, on-time %, discrepancies |
| 25 | `apps/mobile/app/reports/stock-summary.tsx` | Current stock levels across all locations with export | Bag counts per location, critical/low flags |
| 26 | `apps/mobile/app/reports/transactions.tsx` | Transaction history | List of all stock movements with filters |
| 27 | `apps/mobile/app/reports/usage.tsx` | Usage/consumption trends | Daily consumption, by location, by period |

**Suggested warehouse-paper treatment:**

**Reports hub:**
- Masthead: kicker `ANALYTICS — {date}`, title `Reports` (italic)
- Period selector as **outlined chips strip** (7 DAYS / 14 DAYS / 30 DAYS / 90 DAYS) — mono 11pt 600 letter-spaced uppercase, ink-filled when active
- **Quick stats voucher** — stamp-style card showing 3 primary metrics:
  - Total bags used (Fraunces italic 48pt)
  - Daily avg (mono 22pt)
  - Trend % (Fraunces italic 24pt, red if up, green if down — stamp-style directional arrow)
- Report entry ledger (exactly like the Back Office menu pattern):
  - Index, italic entry name, status/quick-stat right, chevron
  - `01 Delivery performance` · `{n} deliveries · {x}% on-time`
  - `02 Stock summary` · `{total} bags across {n} locations`
  - `03 Transaction history` · `{n} this period`
  - `04 Usage trends` · `{daily avg} bags/day`
- Waste summary panel if there's waste to flag — red-bordered 2px callout with `URGENT` / `WASTE` floating frame label

**Individual report pages (stock-summary, deliveries, transactions, usage):**
Use the same pattern:
- Masthead with descriptive kicker + italic title
- Period chips if applicable
- **Bar chart as ticker ladder** — use the `TickerProgressBar` aesthetic for any time-series data. Each bar is a row of filled ink cells; label mono 10pt. This keeps the editorial feel.
- Ledger table for rows of data (like the dashboard locations ledger)
- `Export CSV` / `Export PDF` as outlined InkButtons in the header

**On chart typography:** no curved lines, no filled area charts. Use ticker-style bars + dashed grid lines. Mono axis labels. If a line chart is absolutely needed, draw it as polyline with 2px ink stroke over a mono-labeled axis.

---

### 2.6 — Utility screens reachable from *More* (priority: **P2**)

| # | Path | Purpose |
|---|---|---|
| 28 | `apps/mobile/app/notifications.tsx` | In-app notification feed — bag-used notifications, threshold alerts, daily summaries |
| 29 | `apps/mobile/app/settings.tsx` | App settings — push notification preferences, theme (if we offer one), sign out (redundant with Back Office) |

**Suggested warehouse-paper treatment:**

**Notifications:**
- Masthead: kicker `MAIL ROOM — {date}`, title `Notifications`
- Unread count + mark-all-read outlined InkButton
- Each notification as a compact voucher row:
  - Left: 3px colored ink bar (red for alerts, amber for warnings, ink3 for general)
  - Middle: title (Fraunces italic 15pt) + body (Inter 13pt, 2 lines max)
  - Right: mono 10pt `{time} AGO` kicker
  - Tappable → deep-link to the relevant resource
- Day-group section headers: kicker `TODAY`, `YESTERDAY`, `{DATE}` with solid 1.5px top ink rule

**Settings:**
- Masthead: kicker `PREFERENCES — {date}`, title `Settings`
- ID card (like Back Office) — not duplicated, maybe a compact strip with name/email/role
- Ledger-style settings rows with right-side toggles or values:
  - `Push notifications` → toggle (paper-style switch: outlined box + filled ink dot, no iOS-native green)
  - `Threshold alerts` → toggle
  - `Daily summary time` → mono 14pt value `07:00` (tap to edit)
  - `Language` → chevron, mono uppercase current choice
  - `Theme` → if supported, chevron
- Bottom section for destructive/account actions:
  - `Clear cache`
  - `Sign out` (red-outlined InkButton with red hard 1×1 shadow — same as Back Office)
  - `Delete account` (red-filled destructive)

---

### 2.7 — Auth (priority: **P3**)

First impression of the app. Currently a dark navy gradient with white form — a stark departure from warehouse-paper.

| # | Path | Purpose |
|---|---|---|
| 30 | `apps/mobile/app/(auth)/_layout.tsx` | Stack wrapper for auth routes |
| 31 | `apps/mobile/app/(auth)/login.tsx` | Email + password sign-in |

**Suggested warehouse-paper treatment for Login:**
- Paper background (same `#ECE6D6` + hairlines + warm top vignette)
- Masthead-style header: kicker `POTATO STOCK · EST. {year}`, title `The Stockroom` (italic Fraunces, mega 64pt — it's the opening screen, make the type sing)
- Sub-kicker: `Sign in to continue` in mono 11pt ink3
- DFieldBox `Email` — mono input underlined with ink
- DFieldBox `Password` — mono input underlined with ink, with mono `SHOW / HIDE` toggle
- PrimaryBar-style sign-in button (not sticky-positioned — inline, same style): ink-filled 54px, `2px ink border`, `3×3 hard shadow`
- Forgot-password link underneath as mono 11pt ink2 uppercase underlined
- Tiny footer with `v{APP_VERSION}` in mono 9pt ink3

The login is an **opportunity for personality** — this is where the warehouse-paper concept introduces itself. Consider an ink-stamp marquee with `AUTHORIZED PERSONNEL` at a -5° rotation near the top, to signal the character of what's coming.

---

### 2.8 — Standalone utility (priority: **P3**)

| # | Path | Purpose |
|---|---|---|
| 32 | `apps/mobile/app/scan/index.tsx` | Standalone barcode scanner (reached only from delivery flow — may be inlinable and not a separate screen) |

**Note:** This is a thin wrapper around the existing `BarcodeScanner` component. The component itself renders a camera view + crosshair + scan count + list. It doesn't need a full redesign — only the camera permission empty-state needs warehouse-paper treatment:
- Masthead: kicker `CAMERA — PERMISSION`, title `Scan setup`
- IntentStrip: "We need camera access to read bag barcodes. Turn it on once — you can disable it in settings later."
- Large outlined ink button: `GRANT CAMERA ACCESS`

---

## Section 3 — Request format

For each screen, deliver:

1. **HTML/JSX mock** in the same style as the existing `direction-b.jsx` and `direction-b-extras.jsx` files. Use inline styles, reference existing tokens (`B_TOKENS`), and compose from the `DMasthead`, `DStamp`, `DFieldBox`, `DPrimaryBar`, `DBottomTabs` primitives.
2. **Short layout description** (paragraph form, 100–200 words) explaining intent, hierarchy, and any new affordances.
3. **Flag any new primitive** you introduce so we can decide whether to upstream it into the component library.

Target device for the mock: iPhone 15 Pro width (393pt). All screens must be one-handed operable — no pinch gestures, no 2-hand interactions.

---

## Section 4 — Rules of engagement (what NOT to do)

- ❌ Don't use illustrations, emoji, or stock icons beyond the existing SVG set (`reference/icons.jsx`). Keep iconography line-only at 1.5–2px stroke.
- ❌ Don't propose a dark mode — this direction is light-only by design.
- ❌ Don't use gradients, blur, glassmorphism, filled pills, or any rounded corners. Square everywhere.
- ❌ Don't use a different type scale. Reuse the sizes in the existing spec (38 for titles, 32 for forecast numbers, 24 for voucher quantity, etc.).
- ❌ Don't introduce a new color. If you need an accent not in the palette, extend the token list and argue why.
- ❌ Don't soften the aesthetic because "it reads too harsh" on first impression. The harshness is the signature. It wears in, not off.
- ❌ Don't replace the Stamp with a filled pill on any screen. Stamps are always outlined + rotated.

---

## Section 5 — Priority suggestion

Suggested ordering if you can't deliver all at once:

**Wave 1 (blocks the rest of the redesign feeling complete):**
- `(tabs)/trips.tsx`
- `trip/[id].tsx`
- `trip/create.tsx`
- `(auth)/login.tsx`

**Wave 2 (linked from More — one tap away):**
- `loans.tsx`, `loan/[id].tsx`, `loan/create.tsx`
- All management list screens (drivers, users, vehicles, locations, zones, suppliers — indexes only)
- `notifications.tsx`
- `settings.tsx`

**Wave 3 (details and admin):**
- Management detail + create screens (12 files)
- Reports (5 files)
- Scan permission state

---

## Section 6 — File locations summary

All paths relative to repo root `C:\Users\Moeketsi\Desktop\Repo\stocktracking\`:

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx                        [30, 31]
│   ├── (tabs)/
│   │   └── trips.tsx                        [1]
│   ├── trip/
│   │   ├── [id].tsx                         [2]
│   │   └── create.tsx                       [3]
│   ├── loans.tsx                            [4]
│   ├── loan/
│   │   ├── [id].tsx                         [5]
│   │   └── create.tsx                       [6]
│   ├── drivers/
│   │   ├── index.tsx                        [7]
│   │   ├── [id].tsx                         [8]
│   │   └── create.tsx                       [9]
│   ├── users/
│   │   ├── index.tsx                        [10]
│   │   ├── [id].tsx                         [11]
│   │   └── create.tsx                       [12]
│   ├── vehicles/
│   │   ├── index.tsx                        [13]
│   │   ├── [id].tsx                         [14]
│   │   └── create.tsx                       [15]
│   ├── locations/
│   │   ├── index.tsx                        [16]
│   │   ├── [id].tsx                         [17]
│   │   └── create.tsx                       [18]
│   ├── zones/
│   │   ├── index.tsx                        [19]
│   │   └── [id].tsx                         [20]
│   ├── suppliers/
│   │   ├── index.tsx                        [21]
│   │   └── [id].tsx                         [22]
│   ├── reports/
│   │   ├── index.tsx                        [23]
│   │   ├── deliveries.tsx                   [24]
│   │   ├── stock-summary.tsx                [25]
│   │   ├── transactions.tsx                 [26]
│   │   └── usage.tsx                        [27]
│   ├── notifications.tsx                    [28]
│   ├── settings.tsx                         [29]
│   └── scan/
│       └── index.tsx                        [32]
```

Total: **32 files** across **12 feature areas**.

Original spec (for reference): `apps/design_handoff_stock_warehouse_paper/README.md`
Already-designed screen source: `apps/design_handoff_stock_warehouse_paper/reference/direction-b.jsx`, `direction-b-extras.jsx`

---

## Appendix — Questions for the designer

Surface these in your deliverable if ambiguous:

1. **Trip voucher card** should it visually differ from a Request voucher (different stub color? different stamp palette?) or use the same voucher shape with a different stamp label set?
2. **Loan 8-step progress** — should the ticker-bar show all 8 cells always, or just up to the current state + one ahead?
3. **Management list screens** — is the unified ledger row pattern acceptable across all 6 areas, or should some areas have a different card shape (e.g. Vehicles maybe want a bigger card showing capacity + fuel type visually)?
4. **Reports charts** — explicit confirmation: ticker-bar aesthetic for all bar charts, or do some data types (trend lines) need polylines?
5. **Login stamp marquee** — does the `AUTHORIZED PERSONNEL` / `NO ADMITTANCE` flourish fit the brand? Or should login be understated and all personality held inside the app itself?
6. **Date pickers** — propose a warehouse-paper native date scroller; don't fall back to iOS/Android native (which would break the system).
7. **Settings toggles** — propose a paper-native toggle switch; don't use iOS-native green/grey switch (breaks the system).
