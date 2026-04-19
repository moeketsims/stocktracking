// ─────────────────────────────────────────────────────────────
// Direction B — "Warehouse Paper"
// Editorial, warm paper background, black ink, monospace numerics.
// Tape/label accents. Feels like a real logbook.
// Built for: operators who spend their day moving physical bags.
// ─────────────────────────────────────────────────────────────

const B_TOKENS = {
  paper: '#F1EDE3',
  paperAlt: '#E8E3D6',
  ink: '#1A1916',
  ink2: '#5A5651',
  ink3: '#8F8A7F',
  line: '#D4CCB9',
  lineD: '#1A1916',
  red: '#C23B1F',       // warehouse-label red
  amber: '#C67F00',
  green: '#3B7A3A',
  tape: '#E6D486',      // masking-tape yellow
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  serif: '"Fraunces", "Playfair Display", Georgia, serif',
};
const B = B_TOKENS;

const bKicker = { fontFamily: B.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: B.ink3, fontWeight: 500 };
const bLabel = { fontFamily: B.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: B.ink, fontWeight: 600 };

// subtle paper grain via repeating gradient
const paperBg = {
  background: B.paper,
  backgroundImage: `
    repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(0,0,0,0.025) 23px, rgba(0,0,0,0.025) 24px),
    radial-gradient(ellipse at top, rgba(255,255,255,0.4), transparent 60%)
  `,
};

// Stamp-style status pill
function BStamp({ c = B.red, children, rotate = -2 }) {
  return (
    <span style={{
      display: 'inline-block', transform: `rotate(${rotate}deg)`,
      border: `1.5px solid ${c}`, color: c,
      padding: '2px 8px', fontFamily: B.mono, fontSize: 9, fontWeight: 700,
      letterSpacing: 1.2, textTransform: 'uppercase',
      background: 'transparent',
    }}>{children}</span>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
function B_Dashboard() {
  const d = mockData;

  return (
    <div style={{ ...paperBg, minHeight: '100%', color: B.ink, fontFamily: B.sans, paddingBottom: 96 }}>
      {/* Header as masthead — newspaper style */}
      <div style={{ padding: '60px 20px 14px', borderBottom: `1.5px solid ${B.lineD}`, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: 2, color: B.ink }}>VOL.7 · {fmtDateB()}</div>
          <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: 2, color: B.ink }}>ED. {d.user.loc.toUpperCase()}</div>
        </div>
        <div style={{ fontFamily: B.serif, fontSize: 44, fontWeight: 900, letterSpacing: -1.5, lineHeight: 0.95, fontStyle: 'italic' }}>The Stockroom</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: B.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          <span>Mgr. {d.user.name}</span>
          <span>No. {String(Math.floor(Math.random()*900)+100)}</span>
        </div>
      </div>

      {/* Hero stat — massive serif number, ledger vibe */}
      <div style={{ padding: '22px 20px', borderBottom: `1px solid ${B.line}` }}>
        <div style={bLabel}>On hand today</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
          <div style={{ fontFamily: B.serif, fontSize: 96, fontWeight: 900, letterSpacing: -4, color: B.ink, lineHeight: 0.88 }}>{d.stats.totalBags}</div>
          <div style={{ fontFamily: B.mono, fontSize: 12, color: B.ink2 }}>bags</div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontFamily: B.mono, fontSize: 11 }}>
          <span><span style={{ color: B.green, fontWeight: 700 }}>+{d.stats.receivedToday}</span> <span style={{ color: B.ink3 }}>IN</span></span>
          <span><span style={{ color: B.red, fontWeight: 700 }}>−{d.stats.issuedToday}</span> <span style={{ color: B.ink3 }}>OUT</span></span>
          <span><span style={{ color: B.amber, fontWeight: 700 }}>{d.stats.wastedToday}</span> <span style={{ color: B.ink3 }}>LOSS</span></span>
        </div>
      </div>

      {/* Ledger: signature list view */}
      <div style={{ padding: '18px 0 0' }}>
        <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={bLabel}>Locations — Ledger</div>
          <div style={{ ...bKicker, fontSize: 9 }}>7 ENTRIES</div>
        </div>

        {/* table header */}
        <div style={{ display: 'flex', padding: '0 20px 6px', borderBottom: `1px solid ${B.lineD}`, ...bKicker, fontSize: 9 }}>
          <div style={{ flex: 1 }}>LOCATION</div>
          <div style={{ width: 56, textAlign: 'right' }}>ON HAND</div>
          <div style={{ width: 56, textAlign: 'right' }}>MIN</div>
          <div style={{ width: 70, textAlign: 'right' }}>STATUS</div>
        </div>

        {d.locations.map((l, i) => {
          const stamp = l.status === 'critical' ? 'CRIT' : l.status === 'low' ? 'LOW' : 'OK';
          const sc = l.status === 'critical' ? B.red : l.status === 'low' ? B.amber : B.green;
          return (
            <div key={l.id} style={{ display: 'flex', padding: '12px 20px', alignItems: 'center', borderBottom: `1px dashed ${B.line}`, gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: B.ink, fontFamily: B.sans }}>{l.name}</div>
                <div style={{ fontFamily: B.mono, fontSize: 10, color: B.ink3, marginTop: 1 }}>#{String(1000+l.id)} · {l.item.replace('Charcoal ', '')}</div>
              </div>
              <div style={{ width: 56, textAlign: 'right', fontFamily: B.mono, fontSize: 18, fontWeight: 700, color: B.ink }}>{l.bags}</div>
              <div style={{ width: 56, textAlign: 'right', fontFamily: B.mono, fontSize: 12, color: B.ink3 }}>{l.min}</div>
              <div style={{ width: 70, textAlign: 'right' }}>
                <BStamp c={sc} rotate={(i % 2) ? -3 : 2}>{stamp}</BStamp>
              </div>
            </div>
          );
        })}
      </div>

      {/* Forecast as classified ad */}
      <div style={{ margin: '22px 20px', padding: 16, border: `1.5px solid ${B.lineD}`, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -10, left: 14, background: B.paper, padding: '0 8px', ...bKicker, fontSize: 10 }}>FORECAST</div>
        <div style={{ display: 'flex', gap: 16, fontFamily: B.mono }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>{d.stats.daysCover}</div>
            <div style={{ fontSize: 10, color: B.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>Days cover</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>{d.stats.dailyUse}</div>
            <div style={{ fontSize: 10, color: B.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>Daily rate</div>
          </div>
          <div style={{ flex: 1, borderLeft: `1px dashed ${B.line}`, paddingLeft: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, color: B.red }}>{d.stats.orderQty}</div>
            <div style={{ fontSize: 10, color: B.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>Suggest order</div>
          </div>
        </div>
      </div>

      <BTabBar active="home"/>
    </div>
  );
}

// ── Stock Manager ─────────────────────────────────────────────
function B_StockManager() {
  const d = mockData;
  const need = d.locations.filter(l => l.status !== 'ok');
  const ok   = d.locations.filter(l => l.status === 'ok');

  return (
    <div style={{ ...paperBg, minHeight: '100%', paddingBottom: 96, fontFamily: B.sans, color: B.ink }}>
      <div style={{ padding: '60px 20px 14px', borderBottom: `1.5px solid ${B.lineD}` }}>
        <div style={{ ...bKicker, fontSize: 9 }}>INVENTORY ROLL — {fmtDateB()}</div>
        <div style={{ fontFamily: B.serif, fontStyle: 'italic', fontSize: 38, fontWeight: 900, letterSpacing: -1, lineHeight: 1, marginTop: 4 }}>Stock Count</div>
      </div>

      {/* summary band */}
      <div style={{ display: 'flex', borderBottom: `1.5px solid ${B.lineD}` }}>
        {[
          { l: 'TOTAL', v: d.stats.totalBags, c: B.ink },
          { l: 'CRIT', v: need.filter(l=>l.status==='critical').length, c: B.red },
          { l: 'LOW',  v: need.filter(l=>l.status==='low').length, c: B.amber },
          { l: 'OK',   v: ok.length, c: B.green },
        ].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < arr.length-1 ? `1px solid ${B.line}` : 'none' }}>
            <div style={{ fontFamily: B.mono, fontSize: 26, fontWeight: 700, color: s.c, letterSpacing: -0.5 }}>{s.v}</div>
            <div style={{ fontFamily: B.mono, fontSize: 9, letterSpacing: 1.5, color: B.ink3, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Quick action tape-strip */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Issue', 'Transfer', 'Request', 'Stocktake', 'Waste', 'Export'].map((lab, i) => (
          <button key={i} style={{ background: 'transparent', border: `1.5px solid ${B.lineD}`, padding: '6px 12px', fontFamily: B.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, color: B.ink, cursor: 'pointer' }}>
            {lab}
          </button>
        ))}
      </div>

      {/* Needs attention */}
      <div style={{ padding: '10px 20px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: `1px solid ${B.line}` }}>
        <div style={bLabel}>Needs attention</div>
        <div style={{ ...bKicker, fontSize: 9 }}>{need.length} OF {d.locations.length}</div>
      </div>
      {need.map((l, i) => {
        const stamp = l.status === 'critical' ? 'CRITICAL' : 'LOW';
        const sc = l.status === 'critical' ? B.red : B.amber;
        const shortage = Math.max(0, l.min - l.bags);
        return (
          <div key={l.id} style={{ display: 'flex', padding: '14px 20px', alignItems: 'center', borderBottom: `1px dashed ${B.line}`, gap: 12, background: i === 0 ? 'rgba(194,59,31,0.04)' : 'transparent' }}>
            <div style={{ width: 8, height: 50, background: sc }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: B.ink }}>{l.name}</div>
              <div style={{ fontFamily: B.mono, fontSize: 10, color: B.ink3, marginTop: 3, letterSpacing: 0.5 }}>
                NEED <span style={{ color: sc, fontWeight: 700 }}>+{shortage}</span> / MIN {l.min}
              </div>
            </div>
            <div style={{ fontFamily: B.serif, fontSize: 36, fontWeight: 900, color: sc, letterSpacing: -1, lineHeight: 1 }}>{l.bags}</div>
            <BStamp c={sc} rotate={i%2 ? 3 : -3}>{stamp}</BStamp>
          </div>
        );
      })}

      {/* OK section */}
      <div style={{ padding: '22px 20px 8px' }}>
        <div style={bLabel}>In stock</div>
      </div>
      {ok.map((l, i) => (
        <div key={l.id} style={{ display: 'flex', padding: '12px 20px', alignItems: 'center', borderBottom: `1px dashed ${B.line}`, gap: 12 }}>
          <div style={{ fontFamily: B.mono, fontSize: 10, color: B.ink3, width: 36 }}>{String(i+1).padStart(2,'0')}</div>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: B.ink }}>{l.name}</div>
          <div style={{ fontFamily: B.mono, fontSize: 16, fontWeight: 600, color: B.ink }}>{l.bags}</div>
          <BStamp c={B.green} rotate={0}>OK</BStamp>
        </div>
      ))}

      <BTabBar active="stock"/>
    </div>
  );
}

// ── Staff withdraw ────────────────────────────────────────────
function B_StockStaff() {
  const d = mockData;
  return (
    <div style={{ ...paperBg, minHeight: '100%', paddingBottom: 96, fontFamily: B.sans, color: B.ink, position: 'relative' }}>
      <div style={{ padding: '60px 20px 14px', borderBottom: `1.5px solid ${B.lineD}` }}>
        <div style={{ ...bKicker, fontSize: 9 }}>KITCHEN LEDGER — {d.user.loc.toUpperCase()}</div>
        <div style={{ fontFamily: B.serif, fontStyle: 'italic', fontSize: 34, fontWeight: 900, letterSpacing: -1, marginTop: 4 }}>On the shelf</div>
      </div>

      {/* Hero bag counter */}
      <div style={{ padding: '28px 20px', borderBottom: `1px solid ${B.line}`, textAlign: 'center', position: 'relative' }}>
        <div style={{ fontFamily: B.serif, fontSize: 180, fontWeight: 900, letterSpacing: -10, lineHeight: 0.82, color: B.ink }}>82</div>
        <div style={{ fontFamily: B.mono, fontSize: 11, letterSpacing: 2, color: B.ink3, marginTop: 6 }}>BAGS · CHARCOAL 10KG</div>
        {/* tape accent */}
        <div style={{ position: 'absolute', top: 18, right: -8, width: 72, height: 22, background: B.tape, transform: 'rotate(14deg)', opacity: 0.85, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}/>
        <div style={{ position: 'absolute', top: 22, right: 8, transform: 'rotate(14deg)', fontFamily: B.mono, fontSize: 9, fontWeight: 700, color: B.ink, letterSpacing: 1 }}>RESTOCKED</div>
      </div>

      {/* Transaction log */}
      <div style={{ padding: '18px 20px 8px' }}>
        <div style={bLabel}>Today's log</div>
      </div>
      <div>
        {d.activity.map((a, i) => (
          <div key={i} style={{ display: 'flex', padding: '12px 20px', borderBottom: `1px dashed ${B.line}`, alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: B.mono, fontSize: 10, color: B.ink3, width: 40 }}>{a.ago} AGO</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: B.mono, fontSize: 14, fontWeight: 700, color: a.t === 'Withdrew' ? B.red : B.green }}>
                {a.t === 'Withdrew' ? '−' : '+'}{a.qty} {a.qty === 1 ? 'BAG' : 'BAGS'}
              </div>
              {a.notes && <div style={{ fontSize: 12, color: B.ink2, marginTop: 2, fontStyle: 'italic' }}>"{a.notes}"</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Kitchen stamp-button */}
      <div style={{ position: 'absolute', bottom: 96, right: 16, width: 104, height: 104, background: B.red, border: `3px solid ${B.lineD}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '4px 4px 0 ' + B.lineD, transform: 'rotate(-3deg)' }}>
          <div style={{ fontFamily: B.serif, fontSize: 44, fontWeight: 900, letterSpacing: -2, lineHeight: 1 }}>−1</div>
          <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: 2, marginTop: 2, fontWeight: 700 }}>BAG OUT</div>
      </div>

      <BTabBar active="stock"/>
    </div>
  );
}

// ── Requests ──────────────────────────────────────────────────
function B_Requests() {
  const d = mockData;
  const statusStamp = { pending: 'PENDING', accepted: 'ACCEPT', in_delivery: 'EN ROUTE', trip_created: 'TRIP SET' };
  const statusC = { pending: B.amber, accepted: '#1F3A8A', in_delivery: '#5B2CA5', trip_created: B.green };

  return (
    <div style={{ ...paperBg, minHeight: '100%', paddingBottom: 96, fontFamily: B.sans, color: B.ink }}>
      <div style={{ padding: '60px 20px 14px', borderBottom: `1.5px solid ${B.lineD}` }}>
        <div style={{ ...bKicker, fontSize: 9 }}>ORDER DESK — {fmtDateB()}</div>
        <div style={{ fontFamily: B.serif, fontStyle: 'italic', fontSize: 38, fontWeight: 900, letterSpacing: -1, marginTop: 4 }}>Requests</div>
      </div>

      {/* Summary ledger band */}
      <div style={{ display: 'flex', borderBottom: `1.5px solid ${B.lineD}`, padding: '14px 20px', fontFamily: B.mono, gap: 16 }}>
        <div><span style={{ fontSize: 22, fontWeight: 700 }}>5</span> <span style={{ fontSize: 10, color: B.ink3, letterSpacing: 1 }}>ACTIVE</span></div>
        <div><span style={{ fontSize: 22, fontWeight: 700, color: B.red }}>1</span> <span style={{ fontSize: 10, color: B.ink3, letterSpacing: 1 }}>URGENT</span></div>
        <div><span style={{ fontSize: 22, fontWeight: 700 }}>23</span> <span style={{ fontSize: 10, color: B.ink3, letterSpacing: 1 }}>THIS WK</span></div>
      </div>

      {/* Urgent ticket */}
      <div style={{ margin: '16px 20px', padding: 14, border: `2px solid ${B.red}`, background: 'rgba(194,59,31,0.05)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -10, left: 12, background: B.paper, padding: '0 8px', fontFamily: B.mono, fontSize: 10, color: B.red, fontWeight: 700, letterSpacing: 1.5 }}>URGENT TICKET</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Victoria Island</div>
            <div style={{ fontFamily: B.mono, fontSize: 11, color: B.ink2, marginTop: 2 }}>R-1081 · Tomi A. · 12m ago</div>
          </div>
          <div style={{ fontFamily: B.serif, fontSize: 36, fontWeight: 900, letterSpacing: -1, color: B.red }}>30</div>
        </div>
      </div>

      {/* Tickets list — each one is a voucher */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ ...bLabel, marginTop: 8, marginBottom: 8 }}>Active tickets</div>
        {d.requests.map((r, i) => (
          <div key={r.id} style={{ position: 'relative', background: '#FBF8EF', border: `1px solid ${B.lineD}`, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center', boxShadow: '1px 1px 0 ' + B.lineD }}>
            {/* left perforated stub */}
            <div style={{ position: 'absolute', left: 42, top: 4, bottom: 4, borderLeft: `1px dashed ${B.line}` }}/>
            <div style={{ width: 36, textAlign: 'center' }}>
              <div style={{ fontFamily: B.mono, fontSize: 9, color: B.ink3, letterSpacing: 1 }}>N°</div>
              <div style={{ fontFamily: B.mono, fontSize: 12, fontWeight: 700 }}>{r.id.replace('R-','')}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.loc}</div>
              <div style={{ fontFamily: B.mono, fontSize: 10, color: B.ink3, marginTop: 2 }}>{r.by.toUpperCase()} · {r.t} AGO</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: B.serif, fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>{r.bags}</div>
              <div style={{ fontFamily: B.mono, fontSize: 9, color: B.ink3 }}>BAGS</div>
            </div>
            <BStamp c={statusC[r.status] ?? B.ink} rotate={i%2 ? -4 : 4}>{statusStamp[r.status] ?? r.status}</BStamp>
          </div>
        ))}
      </div>

      <BTabBar active="requests"/>
    </div>
  );
}

function BTabBar({ active }) {
  const items = [
    { k: 'home', label: 'HOME', icon: Icons.home },
    { k: 'requests', label: 'ORDERS', icon: Icons.doc },
    { k: 'trips', label: 'TRIPS', icon: Icons.car },
    { k: 'stock', label: 'STOCK', icon: Icons.cube },
    { k: 'more', label: 'MORE', icon: Icons.grid },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: B.paper, borderTop: `1.5px solid ${B.lineD}`, display: 'flex', paddingBottom: 22, paddingTop: 6 }}>
      {items.map(it => {
        const on = it.k === active;
        return (
          <div key={it.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? B.ink : B.ink3 }}>
            <it.icon s={20} c={on ? B.ink : B.ink3} sw={on ? 2 : 1.5}/>
            <div style={{ fontFamily: B.mono, fontSize: 9, fontWeight: on ? 700 : 500, letterSpacing: 1 }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function fmtDateB() {
  return new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

Object.assign(window, { B_Dashboard, B_StockManager, B_StockStaff, B_Requests, B_TOKENS });
