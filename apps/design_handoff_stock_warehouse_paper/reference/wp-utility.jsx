// Wave 2b — Notifications + Settings + Scan permission

function W_Notifications() {
  const today = [
    { c: W.red,   title: 'Victoria Island is CRITICAL', body: '12 bags remaining — below threshold of 40.', t: '3m' },
    { c: W.amber, title: 'Lekki Phase 1 is LOW',         body: '28 bags remaining — below threshold of 40.', t: '48m' },
    { c: W.ink3,  title: 'Daily summary ready',          body: '38 bags out · 24 bags in · 2 waste. View →', t: '2h' },
  ];
  const yest = [
    { c: W.ink3,  title: 'Trip N°1040 completed',        body: 'Warehouse → Lady Smith · 60 bags delivered.', t: '1D' },
    { c: W.amber, title: 'License expiring',             body: 'Driver Thabo M. — license expires in 14 days.', t: '1D' },
  ];
  const row = (n, i) => (
    <div key={i} style={{ display: 'flex', padding: '14px 20px', borderBottom: `1px dashed ${W.line}`, gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 3, background: n.c, flexShrink: 0, alignSelf: 'stretch' }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={wItalic(15, 700)}>{n.title}</div>
        <div style={{ fontFamily: W.sans, fontSize: 12, color: W.ink2, marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
      </div>
      <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1 }}>{n.t} AGO</div>
    </div>
  );
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`MAIL ROOM — ${fmtDateB()}`} title="Notifications" back right={
        <div style={{ border: `1.5px solid ${W.lineD}`, padding: '5px 10px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3 }}>MARK ALL</div>
      }/>
      <div style={{ padding: '10px 20px 4px', borderBottom: `1.5px solid ${W.lineD}`, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ ...wKicker, fontSize: 10, color: W.ink }}>TODAY</div>
        <div style={wKicker2}>{today.length} ENTRIES</div>
      </div>
      {today.map(row)}
      <div style={{ padding: '14px 20px 4px', borderTop: `1.5px solid ${W.lineD}`, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ ...wKicker, fontSize: 10, color: W.ink }}>YESTERDAY</div>
        <div style={wKicker2}>{yest.length} ENTRIES</div>
      </div>
      {yest.map(row)}
    </div>
  );
}

function W_Settings() {
  const group = (title, rows) => (
    <>
      <div style={{ padding: '18px 20px 8px', borderTop: `1.5px solid ${W.lineD}`, ...wKicker, fontSize: 10, color: W.ink }}>{title}</div>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px dashed ${W.line}`, gap: 12 }}>
          <div style={{ flex: 1, ...wItalic(16, 700) }}>{r.label}</div>
          {r.toggle != null && <WToggle on={r.toggle}/>}
          {r.value && <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 600, letterSpacing: 1, color: W.ink, textTransform: 'uppercase' }}>{r.value}</div>}
          {r.chev && <div style={{ fontFamily: W.mono, fontSize: 14, color: W.ink3 }}>›</div>}
        </div>
      ))}
    </>
  );
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={`PREFERENCES — ${fmtDateB()}`} title="Settings" back/>
      {group('Notifications', [
        { label: 'Push notifications', toggle: true },
        { label: 'Threshold alerts',   toggle: true },
        { label: 'Daily summary time', value: '07:00', chev: true },
      ])}
      {group('General', [
        { label: 'Language', value: 'EN', chev: true },
        { label: 'Clear cache', chev: true },
      ])}
      {group('Account', [
        { label: 'Sign out', chev: true },
      ])}
      <div style={{ padding: '22px 20px', textAlign: 'center' }}>
        <button style={{ background: W.red, color: '#ECE6D6', border: `1.5px solid ${W.red}`, padding: '12px 24px', fontFamily: W.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, boxShadow: `1px 1px 0 ${W.lineD}` }}>DELETE ACCOUNT</button>
      </div>
      <div style={{ textAlign: 'center', fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1.5, padding: '8px 0 20px' }}>POTATO STOCK · v1.0.0</div>
    </div>
  );
}

function W_ScanPermission() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 40, display: 'flex', flexDirection: 'column' }}>
      <WMasthead kicker="CAMERA — PERMISSION" title="Scan setup" back/>
      <WIntentStrip>We need camera access to read bag barcodes. Turn it on once — you can disable it in settings later.</WIntentStrip>
      <div style={{ padding: '40px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 120, height: 120, border: `2.5px solid ${W.lineD}`, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: W.voucherBg || '#F6F1E2', boxShadow: `3px 3px 0 ${W.lineD}` }}>
          <div style={{ position: 'absolute', inset: 12, border: `1.5px dashed ${W.lineD}` }}/>
          <div style={{ fontFamily: W.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 42, letterSpacing: -1 }}>⌖</div>
        </div>
        <div style={{ ...wItalic(26, 900), marginTop: 24 }}>Not yet scanning</div>
        <div style={{ fontFamily: W.mono, fontSize: 10, letterSpacing: 1.3, color: W.ink3, marginTop: 8, textTransform: 'uppercase' }}>CAMERA ACCESS REQUIRED</div>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{ width: '100%', height: 54, background: W.ink, color: '#ECE6D6', border: `2px solid ${W.lineD}`, fontFamily: W.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2.5, boxShadow: `3px 3px 0 ${W.lineD}` }}>GRANT CAMERA ACCESS</button>
        <button style={{ width: '100%', padding: '12px', background: 'transparent', color: W.ink3, border: `1.5px solid ${W.line}`, fontFamily: W.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.8 }}>NOT NOW</button>
      </div>
    </div>
  );
}

Object.assign(window, { W_Notifications, W_Settings, W_ScanPermission });
