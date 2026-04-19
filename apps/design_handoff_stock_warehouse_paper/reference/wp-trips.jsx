// Wave 1 — Trips flow: list, detail, create

const WT = window.B_TOKENS;

// ── TRIPS LIST ────────────────────────────────────────────────
function W_TripsList() {
  const trips = [
    { n: '1043', from: 'Central Warehouse', to: 'Harrismith', veh: 'JX 42 KR GP', drv: 'Thabo M.',  t: '12m',  status: 'IN TRANSIT', sc: W.accepted || '#5B2CA5', sr: -3 },
    { n: '1042', from: 'Bethlehem',         to: 'Ficksburg',  veh: 'DN 118 FS',   drv: 'Khanya P.', t: '1h',   status: 'PLANNED',    sc: W.amber, sr: 3 },
    { n: '1041', from: 'Central Warehouse', to: 'Rustenburg', veh: 'BC 907 NW',   drv: 'Sipho N.',  t: '3h',   status: 'PLANNED',    sc: W.amber, sr: -3 },
  ];
  const done = [
    { n: '1040', from: 'Warehouse', to: 'Lady Smith', veh: 'JX 42 KR GP', drv: 'Thabo M.', t: 'YESTERDAY', status: 'DONE', sc: W.green, sr: 3 },
    { n: '1039', from: 'Warehouse', to: 'Harrismith', veh: 'DN 118 FS',   drv: 'Khanya P.', t: '18 APR',   status: 'DONE', sc: W.green, sr: -3 },
    { n: '1038', from: 'Bethlehem', to: 'Warehouse',  veh: 'BC 907 NW',   drv: 'Sipho N.',  t: '17 APR',   status: 'CANCEL', sc: W.ink3, sr: 3 },
  ];
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker={`DISPATCH LOG — ${fmtDateB()}`} title="Trips"/>
      <WSummaryBand items={[
        { k: 'ACTIVE', v: 3 },
        { k: 'DONE THIS WK', v: 12 },
        { k: 'THIS MO', v: 48, color: W.ink },
        { k: 'CANCEL', v: 2, color: W.red },
      ]}/>
      <WTabStrip active="active" items={[
        { k: 'active', label: 'ACTIVE', count: 3 },
        { k: 'done', label: 'COMPLETED', count: 45 },
        { k: 'all', label: 'ALL' },
      ]}/>

      {/* Search + New */}
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderBottom: `1.5px solid ${W.lineD}`, padding: '6px 0' }}>
          <span style={{ fontFamily: W.mono, fontSize: 12, color: W.ink3, marginRight: 8 }}>⌕</span>
          <span style={{ fontFamily: W.serif, fontStyle: 'italic', fontSize: 14, color: W.ink3 }}>trip # · reg · driver</span>
        </div>
        <div style={{ border: `1.5px solid ${W.lineD}`, padding: '7px 12px', fontFamily: W.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, boxShadow: `1px 1px 0 ${W.lineD}` }}>+ NEW</div>
      </div>

      {/* Active trips — kicker */}
      <div style={{ padding: '18px 20px 8px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ ...wKicker, fontSize: 10 }}>ON THE ROAD</div>
        <div style={{ ...wKicker2 }}>3 TRIPS</div>
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map(tr => (
          <div key={tr.n} style={{ position: 'relative', border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '12px 14px', display: 'flex', alignItems: 'stretch', gap: 12 }}>
            <div style={{ width: 36, borderRight: `1px dashed ${W.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3 }}>N°</div>
              <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>{tr.n}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <div style={wItalic(15, 700)}>{tr.from}</div>
                <div style={{ fontFamily: W.mono, fontSize: 12, color: W.ink3 }}>→</div>
                <div style={wItalic(15, 700)}>{tr.to}</div>
              </div>
              <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.2, color: W.ink3, marginTop: 4, textTransform: 'uppercase' }}>{tr.veh} · {tr.drv} · {tr.t} AGO</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}><WStamp c={tr.sc} rotate={tr.sr}>{tr.status}</WStamp></div>
          </div>
        ))}
      </div>

      {/* Completed section with date rule */}
      <div style={{ marginTop: 24 }}>
        <div style={{ padding: '10px 20px 8px', borderTop: `1.5px solid ${W.lineD}`, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ ...wKicker, fontSize: 10, color: W.ink }}>COMPLETED · THIS WEEK</div>
          <div style={{ ...wKicker2 }}>{done.length} ENTRIES</div>
        </div>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {done.map(tr => (
            <div key={tr.n} style={{ position: 'relative', border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '12px 14px', display: 'flex', alignItems: 'stretch', gap: 12, opacity: 0.75 }}>
              <div style={{ width: 36, borderRight: `1px dashed ${W.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3 }}>N°</div>
                <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>{tr.n}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={wItalic(14, 700)}>{tr.from}</div>
                  <div style={{ fontFamily: W.mono, fontSize: 11, color: W.ink3 }}>→</div>
                  <div style={wItalic(14, 700)}>{tr.to}</div>
                </div>
                <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.2, color: W.ink3, marginTop: 4, textTransform: 'uppercase' }}>{tr.veh} · {tr.t}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}><WStamp c={tr.sc} rotate={tr.sr}>{tr.status}</WStamp></div>
            </div>
          ))}
        </div>
      </div>
      <WBottomTabs active="trips"/>
    </div>
  );
}

// ── TRIP DETAIL ───────────────────────────────────────────────
function W_TripDetail() {
  const stops = [
    { n: 1, type: 'PICKUP',  loc: 'Central Warehouse', planned: 120, actual: 120, state: 'DONE',    sc: W.green, sr: 3 },
    { n: 2, type: 'DROPOFF', loc: 'Harrismith',         planned: 80,  actual: null, state: 'NEXT',    sc: W.red,   sr: -3 },
    { n: 3, type: 'DROPOFF', loc: 'Ficksburg',          planned: 40,  actual: null, state: 'WAITING', sc: W.ink3,  sr: 3 },
  ];
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker="TRIP · N°1043 · 20 APR 2026" title="Dispatch record" back/>
      {/* Hero voucher */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '14px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...wKicker, fontSize: 9 }}>VOUCHER N° 1043</div>
            <WStamp c={W.accepted || '#5B2CA5'} rotate={3}>IN TRANSIT</WStamp>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
            <div style={{ ...wItalic(72, 900), letterSpacing: -3, lineHeight: 0.9 }}>120</div>
            <div style={{ fontFamily: W.mono, fontSize: 11, color: W.ink3, letterSpacing: 1.5 }}>BAGS PLANNED</div>
          </div>
          <div style={{ marginTop: 14, borderTop: `1px dashed ${W.line}`, paddingTop: 10 }}>
            {[['ROUTE', 'Warehouse → Harrismith → Ficksburg'], ['VEHICLE', 'JX 42 KR GP'], ['DRIVER', 'Thabo Mokoena'], ['DEPARTED', '07:42 · 20 APR'], ['ARRIVED', '—']].map((r, i, a) => (
              <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < a.length - 1 ? `1px dashed ${W.line}` : 'none', gap: 10 }}>
                <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, letterSpacing: 1.5 }}>{r[0]}</div>
                <div style={{ fontFamily: W.sans, fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stops ledger */}
      <div style={{ marginTop: 20 }}>
        <div style={{ padding: '0 20px 6px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ ...wKicker, fontSize: 10, color: W.ink }}>STOPS — 1/3 COMPLETE</div>
          <div style={{ ...wKicker2 }}>TICKER</div>
        </div>
        <div style={{ padding: '0 20px 12px' }}>
          <WTickerBar cells={3} filled={1}/>
        </div>
        {stops.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', padding: '14px 20px', borderBottom: `1px dashed ${W.line}`, gap: 10 }}>
            <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, width: 22 }}>{String(s.n).padStart(2,'0')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WStamp c={s.type === 'PICKUP' ? W.ink : W.accepted || '#5B2CA5'} rotate={0}>{s.type}</WStamp>
                <div style={wItalic(16, 700)}>{s.loc}</div>
              </div>
              <div style={{ fontFamily: W.mono, fontSize: 10, letterSpacing: 1, color: W.ink3, marginTop: 4, textTransform: 'uppercase' }}>
                PLANNED {s.planned}{s.actual != null && ` · ACTUAL ${s.actual}`}
              </div>
            </div>
            <WStamp c={s.sc} rotate={s.sr}>{s.state}</WStamp>
          </div>
        ))}
      </div>

      <WActionStack actions={[
        { label: 'DELIVER NEXT STOP →', filled: true },
        { label: 'EDIT TRIP' },
        { label: 'CANCEL TRIP', color: W.red },
      ]}/>
      <div style={{ height: 40 }}/>
    </div>
  );
}

// ── TRIP CREATE ───────────────────────────────────────────────
function W_TripCreate() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker={`NEW TRIP — ${fmtDateB()}`} title="Plan a trip" back/>
      <WIntentStrip>Create a trip to move stock between locations. Pick a vehicle, set the route, add notes.</WIntentStrip>

      <WFieldBox label="Trip type">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { k: 'W→S', l: 'Warehouse to shop', on: true },
            { k: 'S→S', l: 'Shop to shop' },
            { k: 'SUP→W', l: 'Supplier to warehouse' },
            { k: 'S→W', l: 'Shop to warehouse' },
          ].map(t => (
            <div key={t.k} style={{ padding: '10px 12px', border: `1.5px solid ${W.lineD}`, background: t.on ? W.ink : 'transparent', color: t.on ? '#ECE6D6' : W.ink, boxShadow: t.on ? `2px 2px 0 ${W.lineD}` : 'none' }}>
              <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.5, opacity: 0.7 }}>{t.k}</div>
              <div style={wItalic(14, 700)}>{t.l}</div>
            </div>
          ))}
        </div>
      </WFieldBox>

      <WFieldBox label="Vehicle">
        <div style={{ border: `1.5px solid ${W.lineD}` }}>
          {[{ n: 'JX 42 KR GP', m: 'TOYOTA HILUX · 1,200 KG', on: true },
            { n: 'DN 118 FS',   m: 'ISUZU NPR · 2,500 KG' },
            { n: 'BC 907 NW',   m: 'HINO 300 · 3,000 KG' }].map((v, i, a) => (
            <div key={v.n} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < a.length - 1 ? `1px dashed ${W.line}` : 'none', background: v.on ? 'rgba(26,25,22,0.05)' : 'transparent' }}>
              <div style={{ width: 14, height: 14, border: `1.5px solid ${W.lineD}`, marginRight: 12, background: v.on ? W.ink : 'transparent', color: '#ECE6D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{v.on ? '✓' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: W.mono, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{v.n}</div>
                <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.2, color: W.ink3, marginTop: 2 }}>{v.m}</div>
              </div>
            </div>
          ))}
        </div>
      </WFieldBox>

      <WFieldBox label="Driver" right="AUTO-ASSIGN">
        <div style={{ fontFamily: W.serif, fontStyle: 'italic', fontSize: 17, color: W.ink }}>Thabo Mokoena</div>
        <div style={{ fontFamily: W.mono, fontSize: 10, letterSpacing: 1.2, color: W.ink3, marginTop: 2, textTransform: 'uppercase' }}>ACTIVE · LICENSE OK</div>
      </WFieldBox>

      <WFieldBox label="From">
        <div style={wItalic(18, 900)}>Central Warehouse</div>
      </WFieldBox>
      <WFieldBox label="To">
        <div style={wItalic(18, 900)}>Harrismith</div>
      </WFieldBox>

      <WFieldBox label="Notes · optional">
        <div style={{ border: `1.5px solid ${W.lineD}`, padding: 12, minHeight: 60, background: W.voucherBg || '#F6F1E2' }}>
          <div style={{ fontFamily: W.serif, fontStyle: 'italic', fontSize: 14, color: W.ink3 }}>Any additional details…</div>
        </div>
      </WFieldBox>

      <WPrimaryBar label="CREATE TRIP →"/>
    </div>
  );
}

Object.assign(window, { W_TripsList, W_TripDetail, W_TripCreate });
