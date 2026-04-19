// Minimal icon set for stock app — drawn as inline SVG so they scale cleanly.
// All icons take a color + size prop. Stroke-based, 1.8 weight, consistent corners.

const Icon = ({ d, c = 'currentColor', s = 20, sw = 1.8, fill = 'none' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill === 'none' ? 'none' : c} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);

const Icons = {
  home: (p) => <Icon {...p} d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1v-9.5z"/>,
  cube: (p) => <Icon {...p} d={<>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/>
    <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>
  </>}/>,
  doc:  (p) => <Icon {...p} d="M7 3h7l5 5v13H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h4"/>,
  car:  (p) => <Icon {...p} d={<>
    <path d="M4 14l2-6h12l2 6v5h-3v-2H7v2H4v-5z"/>
    <circle cx="7.5" cy="16.5" r="1.3"/>
    <circle cx="16.5" cy="16.5" r="1.3"/>
  </>}/>,
  grid: (p) => <Icon {...p} d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z"/>,
  bell: (p) => <Icon {...p} d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 20a2 2 0 004 0"/>,
  search: (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>}/>,
  flame: (p) => <Icon {...p} d="M12 3c2 4-3 5-3 9a5 5 0 0010 0c0-3-2-5-2-7 0 2-2 3-3 2-1-1-1-2-2-4z"/>,
  warn: (p) => <Icon {...p} d={<><path d="M12 3l10 17H2L12 3z"/><path d="M12 10v4M12 17.5v.1"/></>}/>,
  clock:(p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  plus: (p) => <Icon {...p} d="M12 5v14M5 12h14"/>,
  min:  (p) => <Icon {...p} d="M5 12h14"/>,
  chev: (p) => <Icon {...p} d="M9 6l6 6-6 6"/>,
  chevD:(p) => <Icon {...p} d="M6 9l6 6 6-6"/>,
  chevU:(p) => <Icon {...p} d="M6 15l6-6 6 6"/>,
  arrD: (p) => <Icon {...p} d="M12 5v14M6 13l6 6 6-6"/>,
  arrU: (p) => <Icon {...p} d="M12 19V5M6 11l6-6 6 6"/>,
  arrR: (p) => <Icon {...p} d="M5 12h14M13 6l6 6-6 6"/>,
  swap: (p) => <Icon {...p} d="M7 7h12l-3-3M17 17H5l3 3"/>,
  down: (p) => <Icon {...p} d="M12 4v12M6 10l6 6 6-6M4 20h16"/>,
  loc:  (p) => <Icon {...p} d={<><path d="M12 22s-7-7.5-7-13a7 7 0 0114 0c0 5.5-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></>}/>,
  pkg:  (p) => <Icon {...p} d={<><path d="M4 7l8-4 8 4v10l-8 4-8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/></>}/>,
  check:(p) => <Icon {...p} d="M4 12l5 5 11-11"/>,
  x:    (p) => <Icon {...p} d="M5 5l14 14M19 5L5 19"/>,
  scan: (p) => <Icon {...p} d={<><path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3"/><path d="M4 12h16"/></>}/>,
  spark:(p) => <Icon {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>,
  people:(p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 4.5a3 3 0 010 6M21 20c0-3.5-2-5.5-4.5-6"/></>}/>,
  dots: (p) => <Icon {...p} d={<><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>} fill="solid"/>,
  refresh:(p) => <Icon {...p} d="M20 11a8 8 0 10-2 6.3M20 5v6h-6"/>,
  filter:(p) => <Icon {...p} d="M3 5h18M6 12h12M10 19h4"/>,
  sort: (p) => <Icon {...p} d="M8 3v18M4 7l4-4 4 4M16 21V3M12 17l4 4 4-4"/>,
  tag:  (p) => <Icon {...p} d={<><path d="M4 4h8l8 8-8 8-8-8V4z"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></>}/>,
  logout:(p) => <Icon {...p} d="M15 3h5v18h-5M10 8l-4 4 4 4M6 12h11"/>,
  settings:(p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>}/>,
};

Object.assign(window, { Icons });
