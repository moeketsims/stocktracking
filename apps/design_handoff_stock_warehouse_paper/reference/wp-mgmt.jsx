// Wave 2c — Management screens: list + detail + create for drivers, users, vehicles, locations, zones, suppliers

// Shared list template
function MgmtList({ kicker, title, filters, rows, count }) {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 120 }}>
      <WMasthead kicker={kicker} title={title} back right={<div style={{ border: `1.5px solid ${W.lineD}`, padding: '5px 10px', fontFamily: W.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.3, boxShadow: `1px 1px 0 ${W.lineD}` }}>+ NEW</div>}/>
      {filters && <WTabStrip active={filters[0].k} items={filters}/>}
      <div style={{ padding: '12px 20px 4px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ ...wKicker, fontSize: 9 }}>ENTRY</div>
        <div style={{ ...wKicker, fontSize: 9 }}>STATUS</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px dashed ${W.line}`, gap: 10 }}>
          <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, width: 22 }}>{String(i+1).padStart(2, '0')}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={wItalic(17, 700)}>{r.name}</div>
            <div style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{r.sub}</div>
          </div>
          <WStamp c={r.sc} rotate={i % 2 ? 3 : -3}>{r.status}</WStamp>
          <div style={{ fontFamily: W.mono, fontSize: 14, color: W.ink3 }}>›</div>
        </div>
      ))}
    </div>
  );
}

function W_DriversList() {
  return <MgmtList kicker={`DRIVER ROSTER — ${fmtDateB()}`} title="Drivers"
    filters={[{k:'all',label:'ALL',count:12},{k:'act',label:'ACTIVE',count:9},{k:'pen',label:'PENDING',count:2},{k:'exp',label:'EXPIRED',count:1}]}
    rows={[
      { name: 'Thabo Mokoena',  sub: 'LIC. DL-44812 · EXP 14 MAR 28',  status: 'ACTIVE',  sc: W.green },
      { name: 'Khanya Ndlovu',  sub: 'LIC. DL-33201 · EXP 02 OCT 27',  status: 'ACTIVE',  sc: W.green },
      { name: 'Sipho Ncube',    sub: 'LIC. DL-87703 · EXP 18 MAY 26',  status: 'EXPIRING',sc: W.amber },
      { name: 'Nolwazi Sithole',sub: 'INVITED 12 APR — AWAITING',       status: 'PENDING', sc: W.amber },
      { name: 'Jabu Khumalo',   sub: 'LIC. DL-22099 · EXPIRED 02 MAR',  status: 'EXPIRED', sc: W.red },
    ]}/>;
}

function W_UsersList() {
  return <MgmtList kicker={`STAFF ROSTER — ${fmtDateB()}`} title="Users"
    filters={[{k:'all',label:'ALL',count:18},{k:'adm',label:'ADMIN',count:2},{k:'mgr',label:'MANAGER',count:6},{k:'sta',label:'STAFF',count:10}]}
    rows={[
      { name: 'Amara Okafor',    sub: 'ADMIN · HQ',                 status: 'ACTIVE', sc: W.green },
      { name: 'Khal Pitso',      sub: 'LOC-MGR · HARRISMITH',       status: 'ACTIVE', sc: W.green },
      { name: 'Tomi Akinwale',   sub: 'LOC-MGR · VICTORIA ISLAND',  status: 'ACTIVE', sc: W.green },
      { name: 'Daniel Okoye',    sub: 'STAFF · LEKKI',              status: 'ACTIVE', sc: W.green },
      { name: 'Fatima Bello',    sub: 'ZONE-MGR · WESTERN',         status: 'ACTIVE', sc: W.green },
      { name: 'Chima Nwosu',     sub: 'STAFF · AJAH · INVITED',     status: 'PENDING',sc: W.amber },
    ]}/>;
}

function W_VehiclesList() {
  return <MgmtList kicker={`FLEET ROSTER — ${fmtDateB()}`} title="Vehicles"
    rows={[
      { name: 'JX 42 KR GP',  sub: 'HILUX · 1,200KG · DIESEL',    status: 'ON TRIP', sc: '#5B2CA5' },
      { name: 'DN 118 FS',    sub: 'ISUZU NPR · 2,500KG · DIESEL', status: 'IDLE',    sc: W.green },
      { name: 'BC 907 NW',    sub: 'HINO 300 · 3,000KG · DIESEL',  status: 'IDLE',    sc: W.green },
      { name: 'HP 554 MP',    sub: 'TATA LPT · 4,000KG · DIESEL',  status: 'SERVICE', sc: W.amber },
    ]}/>;
}

function W_LocationsList() {
  return <MgmtList kicker={`LOCATIONS ROSTER — ${fmtDateB()}`} title="Locations"
    rows={[
      { name: 'Central Warehouse', sub: 'WAREHOUSE · WESTERN ZONE',   status: 'OK',       sc: W.green },
      { name: 'Harrismith',        sub: 'SHOP · EASTERN ZONE',         status: 'OK',       sc: W.green },
      { name: 'Victoria Island',   sub: 'SHOP · WESTERN ZONE',         status: 'CRITICAL', sc: W.red },
      { name: 'Lekki Phase 1',     sub: 'SHOP · WESTERN ZONE',         status: 'LOW',      sc: W.amber },
      { name: 'Bethlehem',         sub: 'SHOP · EASTERN ZONE',         status: 'OK',       sc: W.green },
      { name: 'Ficksburg',         sub: 'SHOP · EASTERN ZONE',         status: 'OK',       sc: W.green },
    ]}/>;
}

function W_ZonesList() {
  return <MgmtList kicker={`ZONES ROSTER — ${fmtDateB()}`} title="Zones"
    rows={[
      { name: 'Western zone',  sub: '4 LOCATIONS · MGR FATIMA B.',  status: 'ACTIVE', sc: W.green },
      { name: 'Eastern zone',  sub: '5 LOCATIONS · MGR KHAL P.',    status: 'ACTIVE', sc: W.green },
      { name: 'Northern zone', sub: '2 LOCATIONS · UNASSIGNED',      status: 'NO MGR', sc: W.amber },
    ]}/>;
}

function W_SuppliersList() {
  return <MgmtList kicker={`SUPPLIERS ROSTER — ${fmtDateB()}`} title="Suppliers"
    rows={[
      { name: 'Highveld Farms',     sub: '+27 11 444 2101 · 23 BATCHES', status: 'ACTIVE', sc: W.green },
      { name: 'Free State Potato',  sub: '+27 51 303 8812 · 14 BATCHES', status: 'ACTIVE', sc: W.green },
      { name: 'Mpumalanga Growers', sub: '+27 13 712 0044 · 7 BATCHES',  status: 'ACTIVE', sc: W.green },
      { name: 'KZN Agri',           sub: '+27 31 202 9933 · 0 BATCHES',  status: 'INACTIVE', sc: W.ink3 },
    ]}/>;
}

// ── DETAIL (driver as exemplar — same shape for all) ─────────
function W_DriverDetail() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 180 }}>
      <WMasthead kicker="DRIVER · THABO M." title="Driver record" back/>
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ border: `1px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2', boxShadow: `1px 1px 0 ${W.lineD}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 48, height: 58, border: `1.5px solid ${W.lineD}`, background: W.ink, color: '#ECE6D6', ...wItalic(24, 900), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...wKicker, fontSize: 9 }}>RECORD N° DRV-044</div>
              <div style={wItalic(22, 900)}>Thabo Mokoena</div>
            </div>
            <WStamp c={W.green} rotate={3}>ACTIVE</WStamp>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${W.line}` }}>
            {[['PHONE','+27 82 221 8832'],['EMAIL','THABO.M@POTATO.CO'],['LICENSE','DL-44812'],['EXPIRES','14 MAR 2028'],['HOME LOC','Central Warehouse'],['JOINED','02 JAN 2024']].map((r,i,a) => (
              <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < a.length-1 ? `1px dashed ${W.line}` : 'none' }}>
                <div style={{ fontFamily: W.mono, fontSize: 10, letterSpacing: 1.5, color: W.ink3 }}>{r[0]}</div>
                <div style={{ fontFamily: W.mono, fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ ...wKicker, fontSize: 10, color: W.ink, marginBottom: 8 }}>RECENT TRIPS</div>
        <div style={{ border: `1.5px solid ${W.lineD}`, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3 }}>THIS WEEK</span>
            <span style={{ fontFamily: W.mono, fontSize: 14, fontWeight: 700 }}>6 trips · 1,840 bags</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: `1px dashed ${W.line}`, marginTop: 6 }}>
            <span style={{ fontFamily: W.mono, fontSize: 10, color: W.ink3 }}>THIS MONTH</span>
            <span style={{ fontFamily: W.mono, fontSize: 14, fontWeight: 700 }}>24 trips · 7,230 bags</span>
          </div>
        </div>
      </div>
      <WActionStack actions={[
        { label: 'EDIT RECORD', filled: true },
        { label: 'RESEND INVITATION' },
        { label: 'DEACTIVATE', color: W.amber },
        { label: 'DELETE DRIVER', color: W.red },
      ]}/>
    </div>
  );
}

// ── CREATE (driver as exemplar — same shape for all) ─────────
function W_DriverCreate() {
  return (
    <div style={{ ...wPaperBg, minHeight: '100%', color: W.ink, fontFamily: W.sans, paddingBottom: 160 }}>
      <WMasthead kicker={`NEW DRIVER — ${fmtDateB()}`} title="Invite a driver" back/>
      <WIntentStrip>Send an invitation by email. They'll set their password on first sign-in.</WIntentStrip>
      <WMonoInput label="Full name" value="" placeholder="e.g. Thabo Mokoena" mono={false}/>
      <WMonoInput label="Email"     value="" placeholder="driver@potato.co"/>
      <WMonoInput label="Phone"     value="" placeholder="+27 82 000 0000"/>
      <WMonoInput label="License number" value="" placeholder="DL-00000"/>
      <WFieldBox label="License expires">
        <div style={{ display: 'flex', border: `1.5px solid ${W.lineD}`, background: W.voucherBg || '#F6F1E2' }}>
          {[{l:'DAY',v:'—'},{l:'MONTH',v:'—'},{l:'YEAR',v:'—'}].map((c,i,a) => (
            <div key={c.l} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderRight: i < a.length-1 ? `1.5px solid ${W.lineD}` : 'none' }}>
              <div style={{ fontFamily: W.mono, fontSize: 9, letterSpacing: 1.5, color: W.ink3 }}>{c.l}</div>
              <div style={{ fontFamily: W.mono, fontSize: 22, fontWeight: 700, color: W.ink3, marginTop: 4 }}>{c.v}</div>
            </div>
          ))}
        </div>
      </WFieldBox>
      <WFieldBox label="Home location">
        <div style={wItalic(18, 900)}>Central Warehouse</div>
      </WFieldBox>
      <WPrimaryBar label="SEND INVITATION →"/>
    </div>
  );
}

Object.assign(window, { W_DriversList, W_UsersList, W_VehiclesList, W_LocationsList, W_ZonesList, W_SuppliersList, W_DriverDetail, W_DriverCreate });
