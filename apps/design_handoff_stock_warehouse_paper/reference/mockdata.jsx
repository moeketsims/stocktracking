// Shared mock data — same data feeds every direction so variations are
// genuinely about design, not about content changes.

const mockData = {
  user: { name: 'Amara Okafor', role: 'location_manager', loc: 'Lagos Central' },
  stats: {
    totalBags: 847,
    receivedToday: 24,
    issuedToday: 38,
    wastedToday: 2,
    pendingDeliveries: 3,
    availableRequests: 5,
    daysCover: 14,
    dailyUse: 38.2,
    orderQty: 220,
  },
  locations: [
    { id: 1, name: 'Victoria Island',   item: 'Charcoal 10kg', bags:  12, min: 40, status: 'critical' },
    { id: 2, name: 'Lekki Phase 1',     item: 'Charcoal 10kg', bags:  28, min: 40, status: 'low' },
    { id: 3, name: 'Ikeja GRA',         item: 'Charcoal 10kg', bags:  34, min: 40, status: 'low' },
    { id: 4, name: 'Surulere',          item: 'Charcoal 10kg', bags:  86, min: 50, status: 'ok' },
    { id: 5, name: 'Yaba',              item: 'Charcoal 10kg', bags: 112, min: 50, status: 'ok' },
    { id: 6, name: 'Ajah',              item: 'Charcoal 10kg', bags:  94, min: 50, status: 'ok' },
    { id: 7, name: 'Ikoyi',             item: 'Charcoal 10kg', bags: 156, min: 60, status: 'ok' },
  ],
  requests: [
    { id: 'R-1081', loc: 'Victoria Island', by: 'Tomi A.',   bags: 30, status: 'pending',      urgent: true,  t: '12m' },
    { id: 'R-1080', loc: 'Lekki Phase 1',   by: 'Daniel O.', bags: 20, status: 'accepted',     urgent: false, t: '48m' },
    { id: 'R-1079', loc: 'Ikeja GRA',       by: 'Fatima B.', bags: 15, status: 'in_delivery', urgent: false, t: '2h' },
    { id: 'R-1078', loc: 'Ajah',            by: 'Chima N.',  bags: 25, status: 'trip_created',urgent: false, t: '4h' },
    { id: 'R-1077', loc: 'Yaba',            by: 'Kemi J.',   bags: 10, status: 'pending',      urgent: false, t: '5h' },
  ],
  activity: [
    { t: 'Withdrew',  qty: 2, notes: 'Morning prep',    ago: '8m' },
    { t: 'Withdrew',  qty: 3, notes: 'Lunch service',   ago: '1h' },
    { t: 'Returned',  qty: 1, notes: '',                ago: '2h' },
    { t: 'Withdrew',  qty: 1, notes: '',                ago: '3h' },
    { t: 'Withdrew',  qty: 4, notes: 'Dinner ramp-up',  ago: '4h' },
  ],
};

window.mockData = mockData;
