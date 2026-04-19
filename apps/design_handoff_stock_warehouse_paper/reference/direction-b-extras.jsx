// Warehouse Paper — additional screens
// Place Order · Request Detail · Stock Take · Transfer Stock · More (menu)

const D_TOKENS = (window.B_TOKENS || {});
const D = D_TOKENS;
const dPaperBg = {
  background: '#ECE6D6',
  backgroundImage: `
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.04) 23px, rgba(0,0,0,0.04) 24px),
    radial-gradient(ellipse at top, rgba(255,248,220,0.35), transparent 60%)
  `,
};
const dKicker = { fontFamily: D.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: D.ink3, fontWeight: 500 };
const dLabel  = { fontFamily: D.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: D.ink, fontWeight: 600 };

function DMasthead({ kicker, title, back = true }) {
  return (
    <div style={{ padding: '52px 20px 14px', borderBottom: `1.5px solid ${D.lineD}` }}>
      {back && <div style={{ marginBottom: 8, fontFamily: D.mono, fontSize: 14 }}>←</div>}
      <div style={{ ...dKicker, fontSize: 9 }}>{kicker}</div>
      <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1, marginTop: 4 }}>{title}</div>
    </div>
  );
}

function DStamp({ c = D.red, children, rotate = -2 }) {
  return (
    <span style={{ display: 'inline-block', transform: `rotate(${rotate}deg)`, border: `1.5px solid ${c}`, color: c, padding: '3px 9px', fontFamily: D.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', background: 'transparent' }}>{children}</span>
  );
}

function DFieldBox({ label, children }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: `1px dashed ${D.line}` }}>
      <div style={dLabel}>{label}</div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

// Shared bottom CTA bar (full width, stamp-style)
function DPrimaryBar({ label, disabled }) {
  return (
    <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, padding: '10px 20px 14px', borderTop: `1.5px solid ${D.lineD}`, background: '#ECE6D6' }}>
      <button style={{ width: '100%', height: 54, background: disabled ? '#C9C0A8' : D.ink, color: '#ECE6D6', border: `2px solid ${D.lineD}`, fontFamily: D.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', boxShadow: `3px 3px 0 ${D.lineD}` }}>{label}</button>
    </div>
  );
}

function DBottomTabs({ active }) {
  const items = [['home','HOME',Icons.home], ['orders','ORDERS',Icons.doc], ['stock','STOCK',Icons.cube], ['more','MORE',Icons.grid]];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: '#ECE6D6', borderTop: `1.5px solid ${D.lineD}`, display: 'flex', paddingBottom: 22, paddingTop: 6 }}>
      {items.map(([k,l,Ic]) => {
        const on = k === active;
        return (
          <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? D.ink : D.ink3 }}>
            <Ic s={20} c={on ? D.ink : D.ink3} sw={on ? 2 : 1.5}/>
            <div style={{ fontFamily: D.mono, fontSize: 9, fontWeight: on ? 700 : 500, letterSpacing: 1 }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── PLACE AN ORDER ────────────────────────────────────────────
function D_PlaceOrder() {
  return (
    <div style={{ ...dPaperBg, minHeight: '100%', fontFamily: D.sans, color: D.ink, paddingBottom: 160 }}>
      <DMasthead kicker={`NEW ORDER — ${fmtDateB()}`} title="Place an order"/>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10, padding: 12, border: `1px solid ${D.lineD}`, background: '#F6F1E2', boxShadow: `1px 1px 0 ${D.lineD}` }}>
          <div style={{ width: 3, background: D.ink, flexShrink: 0 }}/>
          <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 13, color: D.ink, lineHeight: 1.4 }}>
            Create a replenishment request. Drivers are notified and can accept the delivery.
          </div>
        </div>

        <DFieldBox label="Quantity · bags">
          <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: `1.5px solid ${D.lineD}`, paddingBottom: 8 }}>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 56, fontWeight: 900, color: D.ink3, letterSpacing: -2 }}>—</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {[5,10,20,50].map(n => (
                <span key={n} style={{ fontFamily: D.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1, border: `1.5px solid ${D.lineD}`, padding: '6px 10px', color: D.ink }}>{n}</span>
              ))}
            </div>
          </div>
          <div style={{ ...dKicker, fontSize: 9, marginTop: 6 }}>TAP A STAMP OR TYPE A NUMBER</div>
        </DFieldBox>

        <DFieldBox label="Urgency">
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, border: `2px solid ${D.lineD}`, padding: '14px 10px', textAlign: 'center', background: D.ink, color: '#ECE6D6', boxShadow: `2px 2px 0 ${D.lineD}` }}>
              <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Normal</div>
              <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: 1.5, marginTop: 2 }}>STANDARD QUEUE</div>
            </div>
            <div style={{ flex: 1, border: `1.5px solid ${D.lineD}`, padding: '14px 10px', textAlign: 'center', background: 'transparent' }}>
              <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: D.red }}>Urgent</div>
              <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: 1.5, color: D.ink3, marginTop: 2 }}>PUSH TO FRONT</div>
            </div>
          </div>
        </DFieldBox>

        <DFieldBox label="Notes · optional">
          <div style={{ border: `1.5px solid ${D.lineD}`, padding: 12, minHeight: 72, background: '#F6F1E2' }}>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 14, color: D.ink3 }}>Any additional details…</div>
          </div>
        </DFieldBox>
      </div>
      <DPrimaryBar label="CREATE REQUEST"/>
      <DBottomTabs active="orders"/>
    </div>
  );
}

// ── REQUEST DETAIL ────────────────────────────────────────────
function D_RequestDetail() {
  return (
    <div style={{ ...dPaperBg, minHeight: '100%', fontFamily: D.sans, color: D.ink, paddingBottom: 160 }}>
      <DMasthead kicker="REQUEST · AAFA · 13 APR 2026"  title="Request detail"/>
      <div style={{ padding: '14px 20px 0' }}>
        {/* Voucher */}
        <div style={{ border: `1px solid ${D.lineD}`, background: '#F6F1E2', boxShadow: `1px 1px 0 ${D.lineD}`, padding: '14px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={dKicker}>VOUCHER N° AAFA</div>
            <DStamp c={D.amber} rotate={3}>PENDING</DStamp>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 88, fontWeight: 900, letterSpacing: -3, color: D.ink, lineHeight: 0.9 }}>2</div>
            <div style={{ fontFamily: D.mono, fontSize: 11, color: D.ink3, letterSpacing: 1.5 }}>BAGS</div>
          </div>

          <div style={{ marginTop: 14, borderTop: `1px dashed ${D.line}`, paddingTop: 10 }}>
            {[
              ['DELIVER TO',   'Harrismith'],
              ['REQUESTED BY', 'Khal Pitso'],
              ['CREATED',      '13 Apr 2026 · 07:58'],
              ['NOTES',        '2 written · tap to read'],
            ].map(([k,v], i, arr) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length-1 ? `1px dashed ${D.line}` : 'none' }}>
                <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1.5, color: D.ink3 }}>{k}</div>
                <div style={{ fontFamily: D.sans, fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock info */}
        <div style={{ marginTop: 18 }}>
          <div style={dLabel}>Stock info</div>
          <div style={{ marginTop: 8, border: `1.5px solid ${D.lineD}`, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1.3, color: D.ink3 }}>CURRENT STOCK</span>
              <span style={{ fontFamily: D.mono, fontSize: 14, fontWeight: 700 }}>1,060 <span style={{ color: D.ink3 }}>· 10,600kg</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: `1px dashed ${D.line}`, marginTop: 6 }}>
              <span style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1.3, color: D.ink3 }}>TARGET STOCK</span>
              <span style={{ fontFamily: D.mono, fontSize: 14, fontWeight: 700 }}>15,000</span>
            </div>
          </div>
        </div>

        {/* Actions — stamp-style stacked */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { lab: 'RESEND TO DRIVERS', c: D.ink },
            { lab: 'EDIT REQUEST',      c: D.ink },
            { lab: 'CANCEL REQUEST',    c: D.red, filled: true },
          ].map(a => (
            <button key={a.lab} style={{ background: a.filled ? a.c : 'transparent', color: a.filled ? '#ECE6D6' : a.c, border: `1.5px solid ${a.c}`, padding: '14px 16px', fontFamily: D.mono, fontSize: 12, fontWeight: 700, letterSpacing: 1.8, cursor: 'pointer', boxShadow: `1px 1px 0 ${D.lineD}` }}>
              {a.lab}
            </button>
          ))}
        </div>
      </div>
      <DBottomTabs active="orders"/>
    </div>
  );
}

// ── STOCK TAKE ────────────────────────────────────────────────
function D_StockTake() {
  return (
    <div style={{ ...dPaperBg, minHeight: '100%', fontFamily: D.sans, color: D.ink, paddingBottom: 160 }}>
      <DMasthead kicker={`STOCK TAKE — ${fmtDateB()}`} title="Count it up"/>

      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: `1.5px solid ${D.lineD}` }}>
        {['ACTIVE COUNT','HISTORY'].map((t,i) => {
          const on = i === 0;
          return (
            <div key={t} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontFamily: D.mono, fontSize: 11, fontWeight: on ? 700 : 500, letterSpacing: 1.5, color: on ? D.ink : D.ink3, borderBottom: on ? `3px solid ${D.ink}` : 'none', marginBottom: -1.5 }}>{t}</div>
          );
        })}
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Progress voucher */}
        <div style={{ border: `1px solid ${D.lineD}`, background: '#F6F1E2', boxShadow: `1px 1px 0 ${D.lineD}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Harrismith</div>
            <div style={{ fontFamily: D.mono, fontSize: 11, color: D.ink2 }}><b>1</b> / 1 COUNTED</div>
          </div>
          <div style={{ display: 'flex', marginTop: 12, height: 8, border: `1px solid ${D.lineD}` }}>
            {Array.from({length: 20}).map((_, i) => (
              <div key={i} style={{ flex: 1, background: D.ink, borderRight: i < 19 ? `1px solid #ECE6D6` : 'none' }}/>
            ))}
          </div>
        </div>

        {/* Item row */}
        <div style={{ border: `1px solid ${D.lineD}`, background: '#F6F1E2', boxShadow: `1px 1px 0 ${D.lineD}`, padding: '14px 16px', marginTop: 12, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 20, fontWeight: 900 }}>Potatoes · 5kg</div>
              <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1.3, color: D.ink3, marginTop: 2 }}>SKU POT-BAG5</div>
            </div>
            <DStamp c={D.green} rotate={3}>COUNTED</DStamp>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14, borderTop: `1px dashed ${D.line}`, paddingTop: 12 }}>
            <div>
              <div style={{ ...dKicker, fontSize: 9 }}>EXPECTED</div>
              <div style={{ fontFamily: D.mono, fontSize: 22, fontWeight: 700, color: D.ink, marginTop: 4 }}>12,930</div>
            </div>
            <div>
              <div style={{ ...dKicker, fontSize: 9 }}>COUNTED</div>
              <div style={{ fontFamily: D.mono, fontSize: 22, fontWeight: 700, color: D.ink, marginTop: 4, borderBottom: `1.5px solid ${D.lineD}`, display: 'inline-block', minWidth: 60 }}>129</div>
            </div>
            <div>
              <div style={{ ...dKicker, fontSize: 9 }}>VARIANCE</div>
              <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 24, fontWeight: 900, color: D.red, letterSpacing: -1, marginTop: 2 }}>−12,801</div>
            </div>
          </div>
        </div>

        {/* Footer actions: stacked, primary + cancel */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ background: D.ink, color: '#ECE6D6', border: `2px solid ${D.lineD}`, padding: '16px', fontFamily: D.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', boxShadow: `3px 3px 0 ${D.lineD}` }}>COMPLETE STOCK TAKE</button>
          <button style={{ background: 'transparent', color: D.red, border: `1.5px solid ${D.red}`, padding: '12px', fontFamily: D.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>CANCEL COUNT</button>
        </div>
      </div>
      <DBottomTabs active="stock"/>
    </div>
  );
}

// ── TRANSFER STOCK ────────────────────────────────────────────
function D_Transfer() {
  const destinations = [
    ['Bethlehem',       'shop'],
    ['Central Warehouse','warehouse'],
    ['Ficksburg',       'shop'],
    ['Lady Smith',      'shop'],
    ['Rustenburg',      'shop'],
  ];
  return (
    <div style={{ ...dPaperBg, minHeight: '100%', fontFamily: D.sans, color: D.ink, paddingBottom: 160 }}>
      <DMasthead kicker={`STOCK MOVEMENT — ${fmtDateB()}`} title="Transfer stock"/>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', gap: 10, padding: 12, border: `1px solid ${D.lineD}`, background: '#F6F1E2', boxShadow: `1px 1px 0 ${D.lineD}` }}>
          <div style={{ width: 3, background: D.ink, flexShrink: 0 }}/>
          <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 13, lineHeight: 1.4 }}>
            Transfer stock from your location to another. Stock is deducted here and added at the destination.
          </div>
        </div>

        <DFieldBox label="From">
          <div style={{ padding: 12, border: `1.5px solid ${D.lineD}`, background: D.ink, color: '#ECE6D6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1.5 }}>◉</span>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 20, fontWeight: 900 }}>Harrismith</div>
            <div style={{ marginLeft: 'auto', fontFamily: D.mono, fontSize: 9, letterSpacing: 1.5, opacity: 0.6 }}>1,060 ON HAND</div>
          </div>
        </DFieldBox>

        <DFieldBox label="Destination">
          <div style={{ border: `1.5px solid ${D.lineD}` }}>
            {destinations.map((loc, i) => {
              const selected = i === 1;
              return (
                <div key={loc[0]} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < destinations.length-1 ? `1px dashed ${D.line}` : 'none', background: selected ? 'rgba(26,25,22,0.05)' : 'transparent' }}>
                  <div style={{ width: 14, height: 14, border: `1.5px solid ${D.lineD}`, marginRight: 12, background: selected ? D.ink : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ECE6D6', fontSize: 10, fontWeight: 900 }}>{selected ? '✓' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 16, fontWeight: 700 }}>{loc[0]}</div>
                    <div style={{ fontFamily: D.mono, fontSize: 9, letterSpacing: 1.5, color: D.ink3, marginTop: 2 }}>{loc[1].toUpperCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </DFieldBox>

        <DFieldBox label="Quantity · bags">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 56, fontWeight: 900, letterSpacing: -2, color: D.ink }}>120</div>
            <div style={{ fontFamily: D.mono, fontSize: 11, color: D.ink3 }}>/ 1,060 available</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {[25,50,100,250,'MAX'].map(n => (
              <span key={n} style={{ flex: 1, textAlign: 'center', fontFamily: D.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1, border: `1.5px solid ${D.lineD}`, padding: '6px 0', color: D.ink }}>{n}</span>
            ))}
          </div>
        </DFieldBox>
      </div>
      <DPrimaryBar label="TRANSFER 120 BAGS →"/>
      <DBottomTabs active="stock"/>
    </div>
  );
}

// ── MORE MENU ─────────────────────────────────────────────────
function D_More() {
  const items = [
    ['Alerts',            '3 open',  D.red],
    ['Pending deliveries','2 inbound', D.amber],
    ['Loans',             '—',       D.ink3],
    ['Drivers',           '4 active', D.green],
    ['Batches',           '—',       D.ink3],
    ['User management',   '6 users', D.ink3],
    ['Stock take',        'started 20 Apr', D.green],
    ['Vehicles',          '—',       D.ink3],
    ['Reports & analytics','—',      D.ink3],
    ['Notifications',     '2 unread', D.amber],
    ['Settings',          '—',       D.ink3],
  ];
  return (
    <div style={{ ...dPaperBg, minHeight: '100%', fontFamily: D.sans, color: D.ink, paddingBottom: 120 }}>
      <div style={{ padding: '52px 20px 14px', borderBottom: `1.5px solid ${D.lineD}` }}>
        <div style={{ ...dKicker, fontSize: 9 }}>STAFF RECORD — {fmtDateB()}</div>
        <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1, marginTop: 4 }}>The Back Office</div>

        {/* ID card */}
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', padding: 12, border: `1.5px solid ${D.lineD}`, background: '#F6F1E2', boxShadow: `2px 2px 0 ${D.lineD}` }}>
          <div style={{ width: 48, height: 58, border: `1.5px solid ${D.lineD}`, background: D.ink, color: '#ECE6D6', fontFamily: D.serif, fontStyle: 'italic', fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>K</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: D.serif, fontStyle: 'italic', fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Khal Pitso</div>
            <div style={{ fontFamily: D.mono, fontSize: 10, color: D.ink3, marginTop: 2, letterSpacing: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>KHAL71823@GMAIL.COM</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
              <DStamp c={D.ink} rotate={-3}>LOC-MGR</DStamp>
              <span style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1, color: D.ink3 }}>· HARRISMITH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu as ledger */}
      <div style={{ padding: '10px 20px 0' }}>
        <div style={{ display: 'flex', padding: '8px 0 4px', borderBottom: `1.5px solid ${D.lineD}`, ...dKicker, fontSize: 9 }}>
          <div style={{ flex: 1 }}>ENTRY</div>
          <div style={{ width: 110, textAlign: 'right' }}>STATUS</div>
          <div style={{ width: 14 }}/>
        </div>
        {items.map((it, i) => (
          <div key={it[0]} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: `1px dashed ${D.line}`, gap: 10 }}>
            <div style={{ fontFamily: D.mono, fontSize: 10, color: D.ink3, width: 22 }}>{String(i+1).padStart(2,'0')}</div>
            <div style={{ flex: 1, fontFamily: D.serif, fontStyle: 'italic', fontSize: 17, fontWeight: 700 }}>{it[0]}</div>
            <div style={{ fontFamily: D.mono, fontSize: 10, letterSpacing: 1, color: it[2] }}>{it[1].toUpperCase()}</div>
            <div style={{ fontFamily: D.mono, fontSize: 12, color: D.ink3 }}>›</div>
          </div>
        ))}

        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <button style={{ background: 'transparent', color: D.red, border: `1.5px solid ${D.red}`, padding: '12px 24px', fontFamily: D.mono, fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', boxShadow: `1px 1px 0 ${D.red}` }}>SIGN OUT →</button>
        </div>
      </div>
      <DBottomTabs active="more"/>
    </div>
  );
}

Object.assign(window, { D_PlaceOrder, D_RequestDetail, D_StockTake, D_Transfer, D_More });
