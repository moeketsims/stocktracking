// Wave 3 — Reports hub + 4 report pages + scan permission state

function W_ReportsHub() {
  const reports = [
    { k: 'MVT', name: 'Stock movement', sub: 'Transfers, receipts, adjustments', chev: true },
    { k: 'ORD', name: 'Orders', sub: 'Volume by zone, fulfillment rate', chev: true },
    { k: 'LOS', name: 'Losses', sub: 'Shrink, damage, variance', chev: true },
    { k: 'TRP', name: 'Trips', sub: 'Driver output, on-time %', chev: true },
    { k: 'SUP', name: 'Suppliers', sub: 'Batches in, quality flags', chev: true },
    { k: 'LOC', name: 'Locations', sub: 'Stock level, throughput', chev: true },
  ];
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`STATISTICS DEPT — ${fmtDateB()}`} title="Reports"/>
      <WChipStrip items={['WEEK','MONTH','QUARTER','YEAR']} active="MONTH"/>
      <WSummaryBand items={[
        { k: 'BAGS MOVED', v: '24.3K' },
        { k: 'ORDERS',     v: 312 },
        { k: 'SHRINK',     v: '1.8%', color: W.amber },
      ]}/>
      <div style={{ padding: '12px 20px 4px', ...wKicker, fontSize: 9, color: W.ink }}>REPORT LIBRARY</div>
      {reports.map((r, i) => (
        <WLedgerRow key={r.k} idx={i+1} primary={r.name} secondary={r.sub}
          trailing={<div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1.5, border: `1px solid ${W.lineD}`, padding: '3px 7px' }}>{r.k}</div>}/>
      ))}
    </div>
  );
}

// Shared ASCII-ish bar chart (paper-native)
function WPaperChart({ series, max, height = 120 }) {
  return (
    <div style={{ border: `1.5px solid ${W.lineD}`, background: W.paper, padding: 12, margin: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
        {series.map((s, i) => {
          const h = (s.v / max) * (height - 22);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3, marginBottom: 3 }}>{s.v}</div>
              <div style={{ width: '80%', height: h, background: s.c || W.ink, border: `1px solid ${W.lineD}` }}/>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6, borderTop: `1px dashed ${W.line}`, paddingTop: 6 }}>
        {series.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1 }}>{s.l}</div>
        ))}
      </div>
    </div>
  );
}

function W_ReportMovement() {
  const s = [
    { l: 'MON', v: 420 }, { l: 'TUE', v: 510 }, { l: 'WED', v: 380 },
    { l: 'THU', v: 620 }, { l: 'FRI', v: 710, c: W.amber }, { l: 'SAT', v: 290 }, { l: 'SUN', v: 180 },
  ];
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`STATISTICS · MOVEMENT — ${fmtDateB()}`} title="Stock movement" back
        right={<div style={{ border: `1.5px solid ${W.lineD}`, padding: '5px 10px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3 }}>EXPORT</div>}/>
      <WChipStrip items={['7D','30D','90D','YTD']} active="7D"/>
      <WSummaryBand items={[
        { k: 'BAGS IN',  v: '3,110', color: W.green },
        { k: 'BAGS OUT', v: '2,840', color: W.red },
        { k: 'NET',      v: '+270' },
      ]}/>
      <div style={{ padding: '14px 20px 8px', ...wKicker, fontSize: 9 }}>BY DAY — BAGS MOVED</div>
      <WPaperChart series={s} max={800}/>
      <div style={{ padding: '18px 20px 8px', ...wKicker, fontSize: 9 }}>TOP ROUTES</div>
      <WLedgerRow idx={1} primary="Central → Lekki"      secondary="12 TRIPS · 840 BAGS" trailing={<div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>34%</div>}/>
      <WLedgerRow idx={2} primary="Central → Harrismith"  secondary="8 TRIPS · 520 BAGS"  trailing={<div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>21%</div>}/>
      <WLedgerRow idx={3} primary="Central → V. Island"   secondary="6 TRIPS · 380 BAGS"  trailing={<div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>15%</div>}/>
    </div>
  );
}

function W_ReportOrders() {
  const s = [
    { l: 'W1', v: 62 }, { l: 'W2', v: 78 }, { l: 'W3', v: 84 }, { l: 'W4', v: 88, c: W.green },
  ];
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`STATISTICS · ORDERS — ${fmtDateB()}`} title="Orders" back
        right={<div style={{ border: `1.5px solid ${W.lineD}`, padding: '5px 10px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3 }}>EXPORT</div>}/>
      <WChipStrip items={['WEEK','MONTH','QUARTER','YEAR']} active="MONTH"/>
      <WSummaryBand items={[
        { k: 'PLACED',     v: 312 },
        { k: 'FULFILLED',  v: '94%', color: W.green },
        { k: 'AVG / DAY',  v: 10 },
      ]}/>
      <div style={{ padding: '14px 20px 8px', ...wKicker, fontSize: 9 }}>ORDERS PLACED · BY WEEK</div>
      <WPaperChart series={s} max={100}/>
      <div style={{ padding: '18px 20px 8px', ...wKicker, fontSize: 9 }}>BY ZONE</div>
      <WLedgerRow idx={1} primary="Western"  secondary="4 LOCATIONS"
        trailing={<div style={{ width: 96, marginRight: 10 }}><WTickerBar cells={10} filled={7}/></div>} status="182"/>
      <WLedgerRow idx={2} primary="Eastern"  secondary="5 LOCATIONS"
        trailing={<div style={{ width: 96, marginRight: 10 }}><WTickerBar cells={10} filled={5}/></div>} status="112"/>
      <WLedgerRow idx={3} primary="Northern" secondary="2 LOCATIONS"
        trailing={<div style={{ width: 96, marginRight: 10 }}><WTickerBar cells={10} filled={2}/></div>} status="18"/>
    </div>
  );
}

function W_ReportLosses() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`STATISTICS · LOSSES — ${fmtDateB()}`} title="Losses" back
        right={<div style={{ border: `1.5px solid ${W.lineD}`, padding: '5px 10px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3 }}>EXPORT</div>}/>
      <WChipStrip items={['WEEK','MONTH','QUARTER','YEAR']} active="MONTH"/>
      <WSummaryBand items={[
        { k: 'SHRINK %',   v: '1.8%', color: W.amber },
        { k: 'BAGS LOST',  v: 438,   color: W.red },
        { k: 'VS. PREV',   v: '−0.4%', color: W.green },
      ]}/>
      <div style={{ padding: '14px 20px 8px', ...wKicker, fontSize: 9 }}>CAUSES — SHARE OF LOSS</div>
      <div style={{ padding: '0 20px' }}>
        {[
          { k: 'Damage',    v: '42%', f: 8, c: W.red },
          { k: 'Variance',  v: '31%', f: 6, c: W.amber },
          { k: 'Theft',     v: '15%', f: 3, c: W.ink },
          { k: 'Spoilage',  v: '12%', f: 2, c: W.ink3 },
        ].map((r, i) => (
          <div key={r.k} style={{ padding: '10px 0', borderBottom: `1px dashed ${W.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ ...wItalic(16, 700), width: 110 }}>{r.k}</div>
            <div style={{ flex: 1 }}><WTickerBar cells={10} filled={r.f} color={r.c}/></div>
            <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700, width: 44, textAlign: 'right' }}>{r.v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '18px 20px 8px', ...wKicker, fontSize: 9 }}>RECENT INCIDENTS</div>
      <WLedgerRow idx={1} primary="Damage during transfer" secondary="VICTORIA ISL. · 14 APR · 22 BAGS" status="RESOLVED" statusColor={W.green}/>
      <WLedgerRow idx={2} primary="Count variance"          secondary="LEKKI · 13 APR · 8 BAGS"         status="OPEN"     statusColor={W.amber}/>
    </div>
  );
}

function W_ReportTrips() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`STATISTICS · TRIPS — ${fmtDateB()}`} title="Trips" back
        right={<div style={{ border: `1.5px solid ${W.lineD}`, padding: '5px 10px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3 }}>EXPORT</div>}/>
      <WChipStrip items={['WEEK','MONTH','QUARTER','YEAR']} active="WEEK"/>
      <WSummaryBand items={[
        { k: 'TRIPS',    v: 42 },
        { k: 'ON TIME',  v: '88%', color: W.green },
        { k: 'AVG KM',   v: 74 },
      ]}/>
      <div style={{ padding: '14px 20px 8px', ...wKicker, fontSize: 9 }}>DRIVER OUTPUT — BAGS MOVED</div>
      <div style={{ padding: '0 20px' }}>
        {[
          { k: 'Thabo M.',    v: 1840, f: 9 },
          { k: 'Khanya N.',   v: 1510, f: 7 },
          { k: 'Sipho N.',    v: 1220, f: 6 },
          { k: 'Jabu K.',     v: 880,  f: 4 },
        ].map((r) => (
          <div key={r.k} style={{ padding: '10px 0', borderBottom: `1px dashed ${W.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ ...wItalic(16, 700), width: 110 }}>{r.k}</div>
            <div style={{ flex: 1 }}><WTickerBar cells={10} filled={r.f}/></div>
            <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700, width: 54, textAlign: 'right' }}>{r.v.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scan permission state (V2 illustrated) ─────────────
function W_ScanPermissionV2() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, padding: '60px 24px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...wKicker, fontSize: 9 }}>FIELD OPS · SCANNER</div>
      <div style={{ ...wItalic(32, 900), marginTop: 6, letterSpacing: -1 }}>We need the camera.</div>
      {/* Illustration: paper camera */}
      <div style={{ margin: '26px auto 0', width: 220, height: 160, border: `1.5px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `3px 3px 0 ${W.lineD}`, position: 'relative', padding: 14 }}>
        <div style={{ ...wKicker2 }}>PERMIT N° 04-CAM</div>
        <div style={{ position: 'absolute', top: 44, left: 20, right: 20, bottom: 20, border: `1.5px solid ${W.lineD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 64, height: 64, border: `2px solid ${W.ink}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${W.ink}`, borderRadius: '50%' }}/>
          </div>
        </div>
        <div style={{ position: 'absolute', top: -8, right: -8, transform: 'rotate(8deg)' }}>
          <WStamp c={W.red} rotate={0}>PENDING</WStamp>
        </div>
      </div>

      <div style={{ marginTop: 28, fontFamily: W.serif, fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: W.ink2 || W.ink3 }}>
        Potato Stock uses the camera to scan bag labels, delivery QR codes and batch stamps. Nothing leaves your phone without a tap.
      </div>

      <div style={{ marginTop: 20, border: `1.5px solid ${W.lineD}`, padding: 12 }}>
        <div style={{ ...wKicker2, marginBottom: 8 }}>WE USE IT FOR</div>
        {['Scanning bags during stock take','Confirming deliveries on trips','Reading batch numbers from suppliers'].map((l) => (
          <div key={l} style={{ display: 'flex', gap: 10, padding: '5px 0', fontFamily: W.mono, fontSize: 11, color: W.ink }}>
            <span style={{ color: W.ink3 }}>·</span>{l}
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}/>

      <button style={{ marginTop: 24, width: '100%', height: 54, background: W.ink, color: '#ECE6D6', border: `2px solid ${W.lineD}`, fontFamily: W.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', boxShadow: `3px 3px 0 ${W.lineD}` }}>ALLOW CAMERA →</button>
      <button style={{ marginTop: 10, width: '100%', height: 44, background: 'transparent', color: W.ink, border: `1.5px solid ${W.lineD}`, fontFamily: W.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, cursor: 'pointer' }}>NOT NOW</button>
      <div style={{ textAlign: 'center', fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1.2, marginTop: 14 }}>YOU CAN CHANGE THIS LATER IN SETTINGS</div>
    </div>
  );
}

Object.assign(window, { W_ReportsHub, W_ReportMovement, W_ReportOrders, W_ReportLosses, W_ReportTrips, W_ScanPermissionV2, WPaperChart });
