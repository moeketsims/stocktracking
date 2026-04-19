// Shared Warehouse Paper primitives for outstanding pages
// Reuses B_TOKENS from direction-b.jsx; adds reusable composers.

const W_T = window.B_TOKENS;
const W = W_T;

const wPaperBg = {
  background: W.paper,
  backgroundImage: `
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.03) 23px, rgba(0,0,0,0.03) 24px),
    radial-gradient(ellipse at top, rgba(255,255,255,0.4), transparent 60%)
  `,
};

const wKicker = { fontFamily: W.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: W.ink3, fontWeight: 500 };
const wKicker2 = { fontFamily: W.mono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: W.ink3, fontWeight: 500 };
const wLabel = { fontFamily: W.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: W.ink, fontWeight: 600 };
const wItalic = (sz=20, w=900) => ({ fontFamily: W.serif, fontStyle: 'italic', fontWeight: w, fontSize: sz, letterSpacing: -0.5, lineHeight: 1.05 });

function WMasthead({ kicker, title, back = false, right = null }) {
  return (
    <div style={{ padding: '52px 20px 14px', borderBottom: `1.5px solid ${W.lineD}` }}>
      {back && <div style={{ marginBottom: 8, fontFamily: W.mono, fontSize: 14 }}>←</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ ...wKicker, fontSize: 9 }}>{kicker}</div>
        {right}
      </div>
      <div style={{ ...wItalic(36, 900), letterSpacing: -1, marginTop: 4 }}>{title}</div>
    </div>
  );
}

function WStamp({ c = W.red, children, rotate = -2 }) {
  return (
    <span style={{ display: 'inline-block', transform: `rotate(${rotate}deg)`, border: `1.5px solid ${c}`, color: c, padding: '3px 9px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</span>
  );
}

function WIntentStrip({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: 12, border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, margin: '14px 20px 0' }}>
      <div style={{ width: 3, background: W.ink, flexShrink: 0 }}/>
      <div style={{ fontFamily: W.serif, fontStyle: 'italic', fontSize: 13, color: W.ink, lineHeight: 1.4 }}>{children}</div>
    </div>
  );
}

function WFieldBox({ label, right = null, children }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px dashed ${W.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={wLabel}>{label}</div>
        {right}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function WPrimaryBar({ label, color = W.ink }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 20px 22px', borderTop: `1.5px solid ${W.lineD}`, background: W.paper }}>
      <button style={{ width: '100%', height: 54, background: color, color: '#ECE6D6', border: `2px solid ${W.lineD}`, fontFamily: W.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', boxShadow: `3px 3px 0 ${W.lineD}` }}>{label}</button>
    </div>
  );
}

function WBottomTabs({ active = 'home' }) {
  const items = [['home','HOME',Icons.home], ['orders','ORDERS',Icons.doc], ['trips','TRIPS',Icons.car], ['stock','STOCK',Icons.cube], ['more','MORE',Icons.grid]];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: W.paper, borderTop: `1.5px solid ${W.lineD}`, display: 'flex', paddingBottom: 22, paddingTop: 6 }}>
      {items.map(([k,l,Ic]) => {
        const on = k === active;
        return (
          <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Ic s={20} c={on ? W.ink : W.ink3} sw={on ? 2 : 1.5}/>
            <div style={{ fontFamily: W.mono, fontSize: 9, fontWeight: on ? 700 : 500, letterSpacing: 1, color: on ? W.ink : W.ink3 }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

// Voucher card — shared for trips, loans, requests
function WVoucher({ n, title, sub, qty, qtyLabel = 'BAGS', stamp, stampColor = W.ink, stampRotate = -3, stub = true }) {
  return (
    <div style={{ position: 'relative', border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '12px 14px 12px 14px', display: 'flex', alignItems: 'stretch', minHeight: 72, gap: 12 }}>
      {stub && (
        <>
          <div style={{ width: 36, borderRight: `1px dashed ${W.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3 }}>N°</div>
            <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>{n}</div>
          </div>
        </>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={wItalic(16, 700)}>{title}</div>
        <div style={{ fontFamily: W.mono, fontSize: 10, letterSpacing: 1, color: W.ink3, marginTop: 3, textTransform: 'uppercase' }}>{sub}</div>
      </div>
      {qty != null && (
        <div style={{ textAlign: 'right', minWidth: 56 }}>
          <div style={wItalic(24, 900)}>{qty}</div>
          <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1 }}>{qtyLabel}</div>
        </div>
      )}
      {stamp && <div style={{ display: 'flex', alignItems: 'center' }}><WStamp c={stampColor} rotate={stampRotate}>{stamp}</WStamp></div>}
    </div>
  );
}

// Ledger row (for management lists, reports, settings)
function WLedgerRow({ idx, primary, secondary, trailing, onChev = true, status, statusColor = W.ink3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: `1px dashed ${W.line}`, gap: 10, margin: '0 20px' }}>
      {idx != null && <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, width: 22 }}>{String(idx).padStart(2, '0')}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={wItalic(17, 700)}>{primary}</div>
        {secondary && <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{secondary}</div>}
      </div>
      {trailing}
      {status && <div style={{ fontFamily: W.mono, fontSize: 10, color: statusColor, letterSpacing: 1, textTransform: 'uppercase' }}>{status}</div>}
      {onChev && <div style={{ fontFamily: W.mono, fontSize: 14, color: W.ink3 }}>›</div>}
    </div>
  );
}

// Summary band — N numeric cells divided by hairlines (used widely)
function WSummaryBand({ items }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1.5px solid ${W.lineD}` }}>
      {items.map((it, i) => (
        <div key={i} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < items.length - 1 ? `1px solid ${W.line}` : 'none' }}>
          <div style={{ fontFamily: W.mono, fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: it.color || W.ink }}>{it.v}</div>
          <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.5, color: W.ink3, textTransform: 'uppercase', marginTop: 2 }}>{it.k}</div>
        </div>
      ))}
    </div>
  );
}

// Chip strip (period selectors, quick-qty chips)
function WChipStrip({ items, active }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 20px 4px' }}>
      {items.map((it) => {
        const on = it === active;
        return (
          <div key={it} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: on ? W.ink : 'transparent', color: on ? '#ECE6D6' : W.ink, border: `1.5px solid ${W.lineD}`, fontFamily: W.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>{it}</div>
        );
      })}
    </div>
  );
}

// Tab strip (Active / Completed / All style)
function WTabStrip({ items, active }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1.5px solid ${W.lineD}` }}>
      {items.map((t) => {
        const on = t.k === active;
        return (
          <div key={t.k} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontFamily: W.mono, fontSize: 11, fontWeight: on ? 700 : 500, letterSpacing: 1.5, color: on ? W.ink : W.ink3, borderBottom: on ? `3px solid ${W.ink}` : 'none', marginBottom: -1.5 }}>
            {t.label}{t.count != null && <span style={{ color: W.ink3, fontWeight: 500 }}>  {t.count}</span>}
          </div>
        );
      })}
    </div>
  );
}

// Toggle switch (paper-native)
function WToggle({ on = false }) {
  return (
    <div style={{ width: 44, height: 22, border: `1.5px solid ${W.lineD}`, background: on ? W.ink : 'transparent', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 24 : 2, width: 14, height: 14, background: on ? W.paper : W.ink, transition: 'left 120ms' }}/>
    </div>
  );
}

// Ticker bar (progress or chart)
function WTickerBar({ cells = 10, filled = 0, color = W.ink, height = 8 }) {
  return (
    <div style={{ display: 'flex', height, border: `1px solid ${W.lineD}` }}>
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} style={{ flex: 1, background: i < filled ? color : 'transparent', borderRight: i < cells - 1 ? `1px solid ${W.paper}` : 'none' }}/>
      ))}
    </div>
  );
}

// Mono input row (dashed-rule underline)
function WMonoInput({ label, value, placeholder, right, mono = true }) {
  const empty = !value;
  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px dashed ${W.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={wLabel}>{label}</div>
        {right && <div style={{ fontFamily: W.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: W.ink3 }}>{right}</div>}
      </div>
      <div style={{ marginTop: 8, borderBottom: `1.5px solid ${W.lineD}`, paddingBottom: 8 }}>
        {empty ? (
          <span style={{ fontFamily: W.serif, fontStyle: 'italic', fontSize: 16, color: W.ink3 }}>{placeholder}</span>
        ) : (
          <span style={{ fontFamily: mono ? W.mono : W.sans, fontSize: 15, fontWeight: 600, color: W.ink, letterSpacing: mono ? 0.5 : 0 }}>{value}</span>
        )}
      </div>
    </div>
  );
}

// Action stack — vertically stacked ink/red buttons
function WActionStack({ actions }) {
  return (
    <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {actions.map((a, i) => {
        const c = a.color || W.ink;
        const filled = a.filled;
        return (
          <button key={i} style={{ background: filled ? c : 'transparent', color: filled ? '#ECE6D6' : c, border: `1.5px solid ${c}`, padding: '14px 16px', fontFamily: W.mono, fontSize: 12, fontWeight: 700, letterSpacing: 1.8, cursor: 'pointer', boxShadow: a.shadow !== false ? `1px 1px 0 ${W.lineD}` : 'none' }}>
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { W_T, wPaperBg, wKicker, wKicker2, wLabel, wItalic, WMasthead, WStamp, WIntentStrip, WFieldBox, WPrimaryBar, WBottomTabs, WVoucher, WLedgerRow, WSummaryBand, WChipStrip, WTabStrip, WToggle, WTickerBar, WMonoInput, WActionStack });
