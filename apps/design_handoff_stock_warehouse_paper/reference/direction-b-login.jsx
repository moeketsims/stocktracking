// Login screens — 3 variations in Warehouse Paper direction

const L_T = window.B_TOKENS;
const L = L_T;
const lPaperBg = {
  background: L.paper,
  backgroundImage: `
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.03) 23px, rgba(0,0,0,0.03) 24px),
    radial-gradient(ellipse at top, rgba(255,255,255,0.4), transparent 60%)
  `,
};
const lKicker = { fontFamily: L.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: L.ink3, fontWeight: 500 };
const lLabel  = { fontFamily: L.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: L.ink, fontWeight: 600 };

function LStamp({ c = L.red, children, rotate = -2 }) {
  return (
    <span style={{ display: 'inline-block', transform: `rotate(${rotate}deg)`, border: `1.5px solid ${c}`, color: c, padding: '3px 9px', fontFamily: L.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase' }}>{children}</span>
  );
}

// ── V1 · Voucher ──────────────────────────────────────────────
// Most on-brand: a physical "entry pass" voucher centered on paper.
function D_Login_Voucher() {
  return (
    <div style={{ ...lPaperBg, minHeight: '100%', color: L.ink, fontFamily: L.sans, padding: '52px 20px 40px', display: 'flex', flexDirection: 'column' }}>
      {/* Tiny masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `1.5px solid ${L.lineD}` }}>
        <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 2, color: L.ink }}>VOL.7 · {fmtDateB()}</div>
        <div style={{ ...lKicker, fontSize: 9 }}>v1.0.0</div>
      </div>

      {/* Wordmark */}
      <div style={{ padding: '40px 0 32px', textAlign: 'center' }}>
        <div style={{ ...lKicker, fontSize: 9 }}>STOCKROOM · ED. SA</div>
        <div style={{ fontFamily: L.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 46, letterSpacing: -1.5, lineHeight: 1, marginTop: 6 }}>
          Potato <span style={{ color: L.red }}>Stock</span>
        </div>
        <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1.5, color: L.ink3, marginTop: 8 }}>
          — EST. 2025 · HARRISMITH —
        </div>
      </div>

      {/* Voucher */}
      <div style={{ position: 'relative', border: `1px solid ${L.lineD}`, background: '#F6F1E2', boxShadow: `2px 2px 0 ${L.lineD}`, padding: '22px 18px 18px' }}>
        {/* stamp */}
        <div style={{ position: 'absolute', top: -12, right: 14 }}>
          <LStamp c={L.red} rotate={-6}>ENTRY PASS</LStamp>
        </div>
        {/* cutout label */}
        <div style={{ position: 'absolute', top: -9, left: 14, background: '#F6F1E2', padding: '0 8px', fontFamily: L.mono, fontSize: 10, letterSpacing: 1.5, color: L.ink2, fontWeight: 700 }}>N° 0·0·1</div>

        <div style={{ marginTop: 4 }}>
          <div style={lLabel}>Email</div>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1.5px solid ${L.lineD}`, padding: '10px 0 8px', marginTop: 4 }}>
            <span style={{ fontFamily: L.mono, fontSize: 12, color: L.ink3, marginRight: 8 }}>@</span>
            <span style={{ fontFamily: L.serif, fontStyle: 'italic', fontSize: 17, color: L.ink2 }}>khal@harrismith.co</span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={lLabel}>Password</div>
            <div style={{ fontFamily: L.mono, fontSize: 9, letterSpacing: 1.2, color: L.ink3, textTransform: 'uppercase' }}>forgot? →</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1.5px solid ${L.lineD}`, padding: '10px 0 8px', marginTop: 4, letterSpacing: 6, fontFamily: L.mono, fontSize: 16, color: L.ink }}>
            ••••••••
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px dashed ${L.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, border: `1.5px solid ${L.lineD}`, background: L.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ECE6D6', fontSize: 10, fontWeight: 900 }}>✓</div>
            <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1, color: L.ink }}>KEEP ME SIGNED IN</div>
          </div>
        </div>

        <button style={{ width: '100%', marginTop: 16, background: L.ink, color: '#ECE6D6', border: `2px solid ${L.lineD}`, padding: '16px', fontFamily: L.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2.5, cursor: 'pointer', boxShadow: `3px 3px 0 ${L.lineD}` }}>
          SIGN IN →
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 32, textAlign: 'center' }}>
        <div style={{ fontFamily: L.mono, fontSize: 9, letterSpacing: 1.5, color: L.ink3 }}>
          NEW HERE? <span style={{ color: L.ink, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>REQUEST ACCESS</span>
        </div>
      </div>
    </div>
  );
}

// ── V2 · Ledger ───────────────────────────────────────────────
// Minimal: log-book entry. No card, just ruled fields on paper.
function D_Login_Ledger() {
  return (
    <div style={{ ...lPaperBg, minHeight: '100%', color: L.ink, fontFamily: L.sans, padding: '52px 20px 40px', display: 'flex', flexDirection: 'column' }}>
      {/* Masthead */}
      <div style={{ borderBottom: `1.5px solid ${L.lineD}`, paddingBottom: 14 }}>
        <div style={{ ...lKicker, fontSize: 9 }}>STAFF LOGBOOK — SIGN IN</div>
        <div style={{ fontFamily: L.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 52, letterSpacing: -2, lineHeight: 0.95, marginTop: 4 }}>
          Who's<br/>at the door?
        </div>
        <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1.2, color: L.ink2, marginTop: 10 }}>
          Sign in to <b style={{ color: L.ink }}>Potato Stock</b> — {fmtDateB()}
        </div>
      </div>

      {/* Ledger fields */}
      <div style={{ marginTop: 8 }}>
        {[
          { k: 'EMAIL',    v: 'you@example.com', placeholder: true },
          { k: 'PASSWORD', v: '••••••••••', placeholder: false, right: 'SHOW' },
        ].map((f, i) => (
          <div key={f.k} style={{ padding: '18px 0 10px', borderBottom: `1px dashed ${L.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={lLabel}>{f.k}</div>
              {f.right && <div style={{ fontFamily: L.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: L.ink3 }}>{f.right}</div>}
            </div>
            <div style={{ fontFamily: f.placeholder ? L.serif : L.mono, fontStyle: f.placeholder ? 'italic' : 'normal', fontSize: f.placeholder ? 20 : 18, color: f.placeholder ? L.ink3 : L.ink, marginTop: 8, letterSpacing: f.placeholder ? 0 : 4 }}>{f.v}</div>
          </div>
        ))}
      </div>

      {/* Checkbox row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 14, height: 14, border: `1.5px solid ${L.lineD}` }}/>
          <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1, color: L.ink }}>REMEMBER ME</div>
        </div>
        <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1.2, color: L.ink, textDecoration: 'underline', textUnderlineOffset: 3 }}>FORGOT?</div>
      </div>

      {/* Big submit */}
      <button style={{ width: '100%', marginTop: 28, background: L.ink, color: '#ECE6D6', border: `2px solid ${L.lineD}`, padding: '20px', fontFamily: L.mono, fontSize: 14, fontWeight: 700, letterSpacing: 3, cursor: 'pointer', boxShadow: `4px 4px 0 ${L.lineD}` }}>
        ENTER THE STOCKROOM
      </button>

      {/* Big italic number */}
      <div style={{ marginTop: 'auto', paddingTop: 32 }}>
        <div style={{ borderTop: `1.5px solid ${L.lineD}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: L.mono, fontSize: 9, letterSpacing: 1.5, color: L.ink3 }}>POTATO STOCK<br/>v1.0.0 · ED.SA</div>
          <div style={{ fontFamily: L.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 56, letterSpacing: -2, color: L.ink3, lineHeight: 0.9 }}>01</div>
        </div>
      </div>
    </div>
  );
}

// ── V3 · Stamped Package ──────────────────────────────────────
// The app as a shipping parcel. Tape, stamps, address-block login.
function D_Login_Parcel() {
  return (
    <div style={{ ...lPaperBg, minHeight: '100%', color: L.ink, fontFamily: L.sans, padding: '44px 18px 40px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* masking tape top */}
      <div style={{ position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%) rotate(-1.5deg)', width: 160, height: 24, background: L.tape, opacity: 0.9, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: L.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: L.ink }}>FRAGILE · STAFF ONLY</span>
      </div>

      <div style={{ marginTop: 70 }}>
        <div style={{ ...lKicker, fontSize: 9 }}>PARCEL N° 0001 · INBOUND</div>
        <div style={{ fontFamily: L.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 38, letterSpacing: -1, lineHeight: 1, marginTop: 4 }}>
          Potato Stock
        </div>
        <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1.3, color: L.ink2, marginTop: 6 }}>
          DELIVER TO: <b style={{ color: L.ink }}>THE HOLDER OF THIS DEVICE</b>
        </div>
      </div>

      {/* Address block */}
      <div style={{ marginTop: 26, border: `1.5px dashed ${L.lineD}`, padding: '18px 16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -9, left: 14, background: L.paper, padding: '0 8px', fontFamily: L.mono, fontSize: 10, letterSpacing: 1.5, color: L.ink, fontWeight: 700 }}>CREDENTIALS</div>

        <div style={{ ...lKicker, fontSize: 9 }}>LINE 1 · EMAIL</div>
        <div style={{ fontFamily: L.mono, fontSize: 15, fontWeight: 600, borderBottom: `1px solid ${L.lineD}`, paddingBottom: 8, marginTop: 4, color: L.ink }}>
          you@example.com
        </div>

        <div style={{ ...lKicker, fontSize: 9, marginTop: 16 }}>LINE 2 · PASSWORD</div>
        <div style={{ fontFamily: L.mono, fontSize: 18, letterSpacing: 5, borderBottom: `1px solid ${L.lineD}`, paddingBottom: 8, marginTop: 4, color: L.ink }}>
          ••••••••
        </div>

        {/* postmark */}
        <div style={{ position: 'absolute', bottom: -18, right: 10, transform: 'rotate(-8deg)', width: 78, height: 78, border: `1.5px solid ${L.red}`, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: L.red, background: 'rgba(241,237,227,0.85)' }}>
          <div style={{ fontFamily: L.mono, fontSize: 8, letterSpacing: 1.5, fontWeight: 700 }}>HARRISMITH</div>
          <div style={{ fontFamily: L.serif, fontStyle: 'italic', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>2026</div>
          <div style={{ fontFamily: L.mono, fontSize: 8, letterSpacing: 1.5, fontWeight: 700 }}>ZA · POST</div>
        </div>
      </div>

      {/* stamps row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 28, justifyContent: 'flex-end' }}>
        <LStamp c={L.ink} rotate={-4}>PRIORITY</LStamp>
        <LStamp c={L.red} rotate={3}>AUTHENTIC</LStamp>
      </div>

      {/* CTA */}
      <button style={{ width: '100%', marginTop: 22, background: L.red, color: '#ECE6D6', border: `2px solid ${L.lineD}`, padding: '18px', fontFamily: L.mono, fontSize: 13, fontWeight: 700, letterSpacing: 2.5, cursor: 'pointer', boxShadow: `3px 3px 0 ${L.lineD}` }}>
        DELIVER ME →
      </button>
      <div style={{ fontFamily: L.mono, fontSize: 10, letterSpacing: 1.2, color: L.ink3, textAlign: 'center', marginTop: 14 }}>
        FORGOT PASSWORD? · REQUEST ACCESS
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 28, textAlign: 'center', fontFamily: L.mono, fontSize: 9, letterSpacing: 1.5, color: L.ink3 }}>
        POTATO STOCK v1.0.0
      </div>
    </div>
  );
}

Object.assign(window, { D_Login_Voucher, D_Login_Ledger, D_Login_Parcel });
