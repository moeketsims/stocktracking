// Wave 2a — Loans flow: list, detail, create

// ── LOANS LIST ────────────────────────────────────────────────
function W_LoansList() {
  const loans = [
    { n: '0214', a: 'Harrismith',  b: 'Bethlehem',  qty: 40, status: 'PENDING',     sc: W.amber,  sr: -3, t: '10m' },
    { n: '0213', a: 'Ficksburg',   b: 'Rustenburg', qty: 25, status: 'IN TRANSIT',  sc: '#5B2CA5', sr: 3,  t: '2h' },
    { n: '0212', a: 'Lady Smith',  b: 'Harrismith', qty: 60, status: 'ACTIVE',      sc: W.green,  sr: -3, t: '3D' },
    { n: '0211', a: 'Harrismith',  b: 'Warehouse',  qty: 30, status: 'RETURN DUE',  sc: W.amber,  sr: 3,  t: '5D' },
  ];
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker={`LOAN LEDGER — ${fmtDateB()}`} title="Loans" back/>
      <WSummaryBand items={[
        { k: 'ACTIVE', v: 4 },
        { k: 'AWAITING RETURN', v: 2, color: W.amber },
        { k: 'COMPLETED', v: 87, color: W.ink3 },
      ]}/>
      <WTabStrip active="borrow" items={[
        { k: 'borrow', label: 'BORROWING', count: 2 },
        { k: 'lend',   label: 'LENDING',   count: 2 },
      ]}/>
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loans.map(l => (
          <div key={l.n} style={{ border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '12px 14px', display: 'flex', gap: 12 }}>
            <div style={{ width: 36, borderRight: `1px dashed ${W.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3 }}>N°</div>
              <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 700 }}>{l.n}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={wItalic(15, 700)}>{l.a}</div>
                <div style={{ fontFamily: W.mono, fontSize: 12, color: W.ink3 }}>↔</div>
                <div style={wItalic(15, 700)}>{l.b}</div>
              </div>
              <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.2, color: W.ink3, marginTop: 4, textTransform: 'uppercase' }}>{l.t} AGO</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={wItalic(22, 900)}>{l.qty}</div>
              <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3 }}>BAGS</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}><WStamp c={l.sc} rotate={l.sr}>{l.status}</WStamp></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LOAN DETAIL ───────────────────────────────────────────────
function W_LoanDetail() {
  const steps = ['PENDING', 'ACCEPTED', 'CONFIRMED', 'IN TRANSIT', 'COLLECTED', 'ACTIVE', 'RETURN INIT', 'RETURN WIP', 'DONE'];
  const current = 5;
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker="LOAN · N°0212 · 17 APR 2026" title="Loan record" back/>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...wKicker, fontSize: 9 }}>VOUCHER N° 0212</div>
            <WStamp c={W.green} rotate={3}>ACTIVE</WStamp>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
            <div style={{ ...wItalic(84, 900), letterSpacing: -3, lineHeight: 0.9 }}>60</div>
            <div style={{ fontFamily: W.mono, fontSize: 11, color: W.ink3, letterSpacing: 1.5 }}>BAGS</div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${W.line}` }}>
            {[['BORROWER','Lady Smith'],['LENDER','Harrismith'],['REQUESTED','15 Apr 2026'],['APPROVED','15 Apr 2026'],['EST. RETURN','25 Apr 2026'],['ACTUAL RETURN','—']].map((r, i, a) => (
              <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < a.length - 1 ? `1px dashed ${W.line}` : 'none' }}>
                <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, letterSpacing: 1.5 }}>{r[0]}</div>
                <div style={{ fontFamily: W.sans, fontSize: 13, fontWeight: 600 }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: '0 20px' }}>
        <div style={{ ...wKicker, fontSize: 10, color: W.ink, marginBottom: 8 }}>PROGRESS — STEP {current} / {steps.length}</div>
        <div style={{ display: 'flex', height: 10, border: `1px solid ${W.lineD}` }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, background: i < current ? W.ink : 'transparent', borderRight: i < steps.length - 1 ? `1px solid ${W.paper}` : 'none' }}/>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: W.mono, fontSize: 8, letterSpacing: 1, color: W.ink3 }}>
          <span>{steps[0]}</span><span style={{ color: W.ink, fontWeight: 700 }}>{steps[current-1]}</span><span>{steps[steps.length-1]}</span>
        </div>
      </div>

      <WActionStack actions={[
        { label: 'INITIATE RETURN →', filled: true },
        { label: 'EDIT LOAN' },
        { label: 'CANCEL LOAN', color: W.red },
      ]}/>
    </div>
  );
}

// ── LOAN CREATE ───────────────────────────────────────────────
function W_LoanCreate() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker={`NEW LOAN — ${fmtDateB()}`} title="Borrow stock" back/>
      <WIntentStrip>Request bags from another location. They'll approve or decline; once approved, a driver delivers to you.</WIntentStrip>

      <WFieldBox label="Lender location">
        <div style={{ border: `1.5px solid ${W.lineD}` }}>
          {['Central Warehouse', 'Bethlehem', 'Rustenburg', 'Lady Smith'].map((n, i, a) => {
            const on = i === 0;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < a.length - 1 ? `1px dashed ${W.line}` : 'none', background: on ? 'rgba(26,25,22,0.05)' : 'transparent' }}>
                <div style={{ width: 14, height: 14, border: `1.5px solid ${W.lineD}`, marginRight: 12, background: on ? W.ink : 'transparent', color: '#ECE6D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{on ? '✓' : ''}</div>
                <div style={{ flex: 1, ...wItalic(16, 700) }}>{n}</div>
                <div style={{ fontFamily: W.mono, fontSize: 9, color: W.ink3, letterSpacing: 1 }}>1,060 ON HAND</div>
              </div>
            );
          })}
        </div>
      </WFieldBox>

      <WFieldBox label="Quantity · bags">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ ...wItalic(52, 900), letterSpacing: -2 }}>50</div>
          <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3 }}>/ 1,060 available</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[10,20,50,100].map(n => (
            <div key={n} style={{ flex: 1, textAlign: 'center', fontFamily: W.mono, fontSize: 11, fontWeight: 600, letterSpacing: 1, border: `1.5px solid ${W.lineD}`, padding: '6px 0', background: n === 50 ? W.ink : 'transparent', color: n === 50 ? '#ECE6D6' : W.ink }}>{n}</div>
          ))}
        </div>
      </WFieldBox>

      <WFieldBox label="Estimated return">
        {/* Paper-native date scroller */}
        <div style={{ display: 'flex', border: `1.5px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2' }}>
          {[{l:'DAY',v:'25'},{l:'MONTH',v:'APR'},{l:'YEAR',v:'2026'}].map((c,i,a) => (
            <div key={c.l} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderRight: i < a.length - 1 ? `1.5px solid ${W.lineD}` : 'none' }}>
              <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.5, color: W.ink3 }}>{c.l}</div>
              <div style={{ fontFamily: W.mono, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{c.v}</div>
            </div>
          ))}
        </div>
      </WFieldBox>

      <WFieldBox label="Notes · optional">
        <div style={{ border: `1.5px solid ${W.lineD}`, padding: 12, minHeight: 60, background: W.voucherBg || '#F6F1E2', fontFamily: W.serif, fontStyle: 'italic', fontSize: 14, color: W.ink3 }}>
          Weekend rush — need a buffer before Saturday service.
        </div>
      </WFieldBox>

      <WPrimaryBar label="REQUEST 50 BAGS →"/>
    </div>
  );
}

Object.assign(window, { W_LoansList, W_LoanDetail, W_LoanCreate });
