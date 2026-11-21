import type { Hub, Facility, Helpline, Checklist, NEState } from '@/types'

// ─── NE India Hubs ─────────────────────────────────────────────────────────
export const NE_HUBS: Hub[] = [
  // Assam
  {
    id: 'guwahati', name: 'Guwahati', state: 'Assam',
    lat: 26.1445, lng: 91.7362, terrain: 'valley_flood',
    elevation: 55, population: 1100000, floodZone: true, landslideZone: false,
  },
  {
    id: 'silchar', name: 'Silchar', state: 'Assam',
    lat: 24.8333, lng: 92.7789, terrain: 'mixed',
    elevation: 20, population: 228785, floodZone: true, landslideZone: true,
  },
  {
    id: 'jorhat', name: 'Jorhat', state: 'Assam',
    lat: 26.7465, lng: 94.2026, terrain: 'valley_flood',
    elevation: 116, population: 153677, floodZone: true, landslideZone: false,
  },
  // Meghalaya
  {
    id: 'shillong', name: 'Shillong', state: 'Meghalaya',
    lat: 25.5788, lng: 91.8933, terrain: 'hilly_landslide',
    elevation: 1496, population: 357874, floodZone: false, landslideZone: true,
  },
  // Arunachal Pradesh
  {
    id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh',
    lat: 27.0844, lng: 93.6053, terrain: 'hilly_landslide',
    elevation: 400, population: 60000, floodZone: false, landslideZone: true,
  },
  // Manipur
  {
    id: 'imphal', name: 'Imphal', state: 'Manipur',
    lat: 24.8170, lng: 93.9368, terrain: 'mixed',
    elevation: 786, population: 414288, floodZone: false, landslideZone: true,
  },
  // Mizoram
  {
    id: 'aizawl', name: 'Aizawl', state: 'Mizoram',
    lat: 23.7271, lng: 92.7176, terrain: 'hilly_landslide',
    elevation: 1132, population: 400309, floodZone: false, landslideZone: true,
  },
  // Nagaland
  {
    id: 'kohima', name: 'Kohima', state: 'Nagaland',
    lat: 25.6701, lng: 94.1077, terrain: 'hilly_landslide',
    elevation: 1444, population: 99039, floodZone: false, landslideZone: true,
  },
  // Tripura
  {
    id: 'agartala', name: 'Agartala', state: 'Tripura',
    lat: 23.8315, lng: 91.2868, terrain: 'mixed',
    elevation: 13, population: 400004, floodZone: true, landslideZone: true,
  },
  // Sikkim
  {
    id: 'gangtok', name: 'Gangtok', state: 'Sikkim',
    lat: 27.3389, lng: 88.6065, terrain: 'hilly_landslide',
    elevation: 1650, population: 100286, floodZone: false, landslideZone: true,
  },
  // ── District-level coverage (indicative coordinates/elevation) ───────────
  {
    id: 'barpeta', name: 'Barpeta', state: 'Assam',
    lat: 26.3220, lng: 91.0046, terrain: 'valley_flood',
    elevation: 35, population: 120000, floodZone: true, landslideZone: false,
  },
  {
    id: 'haflong', name: 'Haflong (Dima Hasao)', state: 'Assam',
    lat: 25.1667, lng: 93.0167, terrain: 'mixed',
    elevation: 680, population: 25000, floodZone: false, landslideZone: true,
  },
  {
    id: 'tura', name: 'Tura', state: 'Meghalaya',
    lat: 25.5140, lng: 90.2020, terrain: 'mixed',
    elevation: 350, population: 75000, floodZone: false, landslideZone: true,
  },
  {
    id: 'lunglei', name: 'Lunglei', state: 'Mizoram',
    lat: 22.8870, lng: 92.7350, terrain: 'hilly_landslide',
    elevation: 720, population: 57000, floodZone: false, landslideZone: true,
  },
  {
    id: 'champhai', name: 'Champhai', state: 'Mizoram',
    lat: 23.4720, lng: 93.3260, terrain: 'hilly_landslide',
    elevation: 1678, population: 33000, floodZone: false, landslideZone: true,
  },
  {
    id: 'tawang', name: 'Tawang', state: 'Arunachal Pradesh',
    lat: 27.5860, lng: 91.8590, terrain: 'hilly_landslide',
    elevation: 3048, population: 11000, floodZone: false, landslideZone: true,
  },
  {
    id: 'namsai', name: 'Namsai', state: 'Arunachal Pradesh',
    lat: 27.6690, lng: 95.8640, terrain: 'valley_flood',
    elevation: 150, population: 20000, floodZone: true, landslideZone: false,
  },
  {
    id: 'churachandpur', name: 'Churachandpur', state: 'Manipur',
    lat: 24.3330, lng: 93.6770, terrain: 'mixed',
    elevation: 900, population: 60000, floodZone: false, landslideZone: true,
  },
  {
    id: 'wokha', name: 'Wokha', state: 'Nagaland',
    lat: 26.0970, lng: 94.2630, terrain: 'hilly_landslide',
    elevation: 1313, population: 35000, floodZone: false, landslideZone: true,
  },
  {
    id: 'kailashahar', name: 'Kailashahar', state: 'Tripura',
    lat: 24.3300, lng: 92.0100, terrain: 'mixed',
    elevation: 28, population: 22000, floodZone: true, landslideZone: false,
  },
  {
    id: 'namchi', name: 'Namchi', state: 'Sikkim',
    lat: 27.1670, lng: 88.3530, terrain: 'hilly_landslide',
    elevation: 1315, population: 12000, floodZone: false, landslideZone: true,
  },
]

export const DEFAULT_HUB = NE_HUBS[0]

// ─── Facilities ────────────────────────────────────────────────────────────
export const NE_FACILITIES: Facility[] = [
  {
    id: 'f001', name: 'Sarusajai Relief Shelter', type: 'shelter',
    hubId: 'guwahati', state: 'Assam',
    lat: 26.1764, lng: 91.7441, address: 'Sarusajai Stadium, Guwahati',
    phone: '03612345678', capacity: 2000, currentOccupancy: 450, verified: true,
  },
  {
    id: 'f002', name: 'Gauhati Medical College & Hospital', type: 'hospital',
    hubId: 'guwahati', state: 'Assam',
    lat: 26.1870, lng: 91.7520, address: 'GMC Road, Bhangagarh, Guwahati',
    phone: '03612529457', verified: true,
  },
  {
    id: 'f003', name: 'Dispur Police Station', type: 'police',
    hubId: 'guwahati', state: 'Assam',
    lat: 26.1358, lng: 91.7898, address: 'Dispur, Guwahati',
    phone: '03612260001', verified: true,
  },
  {
    id: 'f004', name: 'Fancy Bazaar Relief Camp', type: 'shelter',
    hubId: 'guwahati', state: 'Assam',
    lat: 26.1854, lng: 91.7513, address: 'Fancy Bazaar School, Guwahati',
    phone: '03612346789', capacity: 800, currentOccupancy: 120, verified: true,
  },
  {
    id: 'f005', name: 'NEIGRIHMS Hospital', type: 'hospital',
    hubId: 'shillong', state: 'Meghalaya',
    lat: 25.5673, lng: 91.8787, address: 'Mawdiangdiang, Shillong',
    phone: '03642538000', verified: true,
  },
  {
    id: 'f006', name: 'Laitumkhrah Community Shelter', type: 'shelter',
    hubId: 'shillong', state: 'Meghalaya',
    lat: 25.5700, lng: 91.8830, address: 'Laitumkhrah, Shillong',
    phone: '03642225000', capacity: 500, currentOccupancy: 80, verified: true,
  },
  {
    id: 'f007', name: 'TRIHMS Hospital', type: 'hospital',
    hubId: 'itanagar', state: 'Arunachal Pradesh',
    lat: 27.0942, lng: 93.6137, address: 'Naharlagun, Itanagar',
    phone: '03602244310', verified: true,
  },
  {
    id: 'f008', name: 'RIMS Hospital Imphal', type: 'hospital',
    hubId: 'imphal', state: 'Manipur',
    lat: 24.8075, lng: 93.9388, address: 'Lamphelpat, Imphal West',
    phone: '03852411300', verified: true,
  },
  {
    id: 'f009', name: 'Khuman Lampak Relief Shelter', type: 'shelter',
    hubId: 'imphal', state: 'Manipur',
    lat: 24.8028, lng: 93.9272, address: 'Khuman Lampak, Imphal',
    phone: '03852221034', capacity: 1200, currentOccupancy: 200, verified: true,
  },
  {
    id: 'f010', name: 'Mizoram State Hospital', type: 'hospital',
    hubId: 'aizawl', state: 'Mizoram',
    lat: 23.7332, lng: 92.7147, address: 'Falkawn, Aizawl',
    phone: '03892327241', verified: true,
  },
  {
    id: 'f011', name: 'Naga Hospital, Kohima', type: 'hospital',
    hubId: 'kohima', state: 'Nagaland',
    lat: 25.6695, lng: 94.1085, address: 'Hospital Road, Kohima',
    phone: '03702291010', verified: true,
  },
  {
    id: 'f012', name: 'GBP Hospital Agartala', type: 'hospital',
    hubId: 'agartala', state: 'Tripura',
    lat: 23.8352, lng: 91.2743, address: 'Kunjaban, Agartala',
    phone: '03812326051', verified: true,
  },
  {
    id: 'f013', name: 'Vivekananda Maidan Relief Camp', type: 'shelter',
    hubId: 'agartala', state: 'Tripura',
    lat: 23.8347, lng: 91.2855, address: 'Vivekananda Maidan, Agartala',
    phone: '03812322000', capacity: 1500, currentOccupancy: 300, verified: true,
  },
  {
    id: 'f014', name: 'STNM Hospital Gangtok', type: 'hospital',
    hubId: 'gangtok', state: 'Sikkim',
    lat: 27.3291, lng: 88.6065, address: 'PO Tadong, Gangtok',
    phone: '03592202427', verified: true,
  },
  {
    id: 'f015', name: 'Silchar Medical College', type: 'hospital',
    hubId: 'silchar', state: 'Assam',
    lat: 24.8187, lng: 92.8085, address: 'Ghungoor, Silchar',
    phone: '03842224566', verified: true,
  },
  {
    id: 'f016', name: 'Jorhat Medical College', type: 'hospital',
    hubId: 'jorhat', state: 'Assam',
    lat: 26.7447, lng: 94.2027, address: 'AT Road, Jorhat',
    phone: '03762320427', verified: true,
  },
]

// ─── Helplines ─────────────────────────────────────────────────────────────
export const NE_HELPLINES: Helpline[] = [
  { id: 'h001', name: 'National Emergency', number: '112', category: 'National Emergency', available24x7: true },
  { id: 'h002', name: 'NDMA Disaster Helpline', number: '1070', category: 'State Disaster', available24x7: true },
  { id: 'h003', name: 'National Disaster Helpline', number: '1077', category: 'State Disaster', available24x7: true },
  { id: 'h004', name: 'Ambulance', number: '108', category: 'Medical', available24x7: true },
  { id: 'h005', name: 'Police', number: '100', category: 'Police', available24x7: true },
  { id: 'h006', name: 'Fire Brigade', number: '101', category: 'Fire', available24x7: true },
  { id: 'h007', name: 'NDRF Headquarters', number: '011-24363260', category: 'NDRF', available24x7: true },
  { id: 'h008', name: 'ASDMA Control Room', number: '1800-345-3588', category: 'State Disaster', state: 'Assam', available24x7: true },
  { id: 'h009', name: 'Assam Police', number: '0361-2237240', category: 'Police', state: 'Assam', available24x7: true },
  { id: 'h010', name: 'Guwahati District Control Room', number: '0361-2735001', category: 'District Control', state: 'Assam', hubId: 'guwahati', available24x7: true },
  { id: 'h011', name: 'Silchar District Control Room', number: '03842-224000', category: 'District Control', state: 'Assam', hubId: 'silchar', available24x7: true },
  { id: 'h012', name: 'Jorhat District Control Room', number: '0376-2320001', category: 'District Control', state: 'Assam', hubId: 'jorhat', available24x7: true },
  { id: 'h013', name: 'Meghalaya SDMA', number: '0364-2224320', category: 'State Disaster', state: 'Meghalaya', available24x7: true },
  { id: 'h014', name: 'Shillong Control Room', number: '0364-2225411', category: 'District Control', state: 'Meghalaya', hubId: 'shillong', available24x7: true },
  { id: 'h015', name: 'Arunachal SDMA', number: '0360-2244801', category: 'State Disaster', state: 'Arunachal Pradesh', available24x7: true },
  { id: 'h016', name: 'Itanagar Control Room', number: '0360-2211616', category: 'District Control', state: 'Arunachal Pradesh', hubId: 'itanagar', available24x7: true },
  { id: 'h017', name: 'Manipur SDMA', number: '0385-2443419', category: 'State Disaster', state: 'Manipur', available24x7: true },
  { id: 'h018', name: 'Imphal Control Room', number: '0385-2452222', category: 'District Control', state: 'Manipur', hubId: 'imphal', available24x7: true },
  { id: 'h019', name: 'Mizoram SDMA', number: '0389-2322011', category: 'State Disaster', state: 'Mizoram', available24x7: true },
  { id: 'h020', name: 'Aizawl Control Room', number: '0389-2321411', category: 'District Control', state: 'Mizoram', hubId: 'aizawl', available24x7: true },
  { id: 'h021', name: 'Nagaland SDMA', number: '0370-2271420', category: 'State Disaster', state: 'Nagaland', available24x7: true },
  { id: 'h022', name: 'Kohima Control Room', number: '0370-2290411', category: 'District Control', state: 'Nagaland', hubId: 'kohima', available24x7: true },
  { id: 'h023', name: 'Tripura SDMA', number: '0381-2415412', category: 'State Disaster', state: 'Tripura', available24x7: true },
  { id: 'h024', name: 'Agartala Control Room', number: '0381-2324001', category: 'District Control', state: 'Tripura', hubId: 'agartala', available24x7: true },
  { id: 'h025', name: 'Sikkim SDMA', number: '03592-204884', category: 'State Disaster', state: 'Sikkim', available24x7: true },
  { id: 'h026', name: 'Gangtok Control Room', number: '03592-202018', category: 'District Control', state: 'Sikkim', hubId: 'gangtok', available24x7: true },
]

// ─── Checklists ────────────────────────────────────────────────────────────
export const NE_CHECKLISTS: Checklist[] = [
  {
    type: 'flood',
    title: 'Flood Preparedness Checklist',
    items: [
      { id: 'fl001', text: 'Move to higher ground immediately if water levels rise', critical: true },
      { id: 'fl002', text: 'Store 3 days of drinking water (4L per person per day)', critical: true },
      { id: 'fl003', text: 'Keep important documents in waterproof bag', critical: true },
      { id: 'fl004', text: 'Charge all devices and power banks', critical: false },
      { id: 'fl005', text: 'Identify nearest relief shelter location', critical: true },
      { id: 'fl006', text: 'Prepare emergency kit: torch, first aid, dry food, medicines', critical: true },
      { id: 'fl007', text: 'Disconnect electrical appliances and turn off mains', critical: true },
      { id: 'fl008', text: 'Save ASDMA/SDMA helpline numbers on all phones', critical: false },
      { id: 'fl009', text: 'Share your location with family/emergency contacts', critical: false },
      { id: 'fl010', text: 'Do NOT attempt to cross flooded roads or streams', critical: true },
    ],
  },
  {
    type: 'landslide',
    title: 'Landslide Safety Checklist',
    items: [
      { id: 'ls001', text: 'Evacuate slope-adjacent areas immediately on warning', critical: true },
      { id: 'ls002', text: 'Watch for warning signs: cracks in soil, tilting trees', critical: true },
      { id: 'ls003', text: 'Avoid steep slopes and hill-cut areas during heavy rain', critical: true },
      { id: 'ls004', text: 'Do NOT take shelter under large trees on slopes', critical: true },
      { id: 'ls005', text: 'Keep emergency tools: spade, rope, torch accessible', critical: false },
      { id: 'ls006', text: 'Know alternate road routes in your district', critical: false },
      { id: 'ls007', text: 'Report cracks or soil movement to district authorities', critical: false },
      { id: 'ls008', text: 'Keep car fuel tank at least half-full during monsoon', critical: false },
      { id: 'ls009', text: 'Store 48-hour food supply and water', critical: true },
    ],
  },
  {
    type: 'earthquake',
    title: 'Earthquake Readiness Checklist',
    items: [
      { id: 'eq001', text: 'During shaking: Drop, Cover, Hold On (under sturdy table)', critical: true },
      { id: 'eq002', text: 'Stay away from windows, exterior walls, and heavy furniture', critical: true },
      { id: 'eq003', text: 'After shaking stops: check for gas leaks and fire', critical: true },
      { id: 'eq004', text: 'Have emergency kit ready: water, food, first aid, radio', critical: true },
      { id: 'eq005', text: 'Secure heavy bookshelves and water heaters to walls', critical: false },
      { id: 'eq006', text: 'Know your building assembly point', critical: false },
      { id: 'eq007', text: 'Store copies of insurance and ID documents digitally', critical: false },
      { id: 'eq008', text: 'Practice earthquake drills with family twice a year', critical: false },
      { id: 'eq009', text: 'Know how to shut off gas, water, and electricity mains', critical: true },
    ],
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────
export const NE_STATES: NEState[] = [
  'Assam', 'Meghalaya', 'Arunachal Pradesh', 'Manipur',
  'Mizoram', 'Nagaland', 'Tripura', 'Sikkim',
]

export const getHubsByState = (state: NEState): Hub[] =>
  NE_HUBS.filter((h) => h.state === state)

export const getHubById = (id: string): Hub | undefined =>
  NE_HUBS.find((h) => h.id === id)

export const getFacilitiesByHub = (hubId: string): Facility[] =>
  NE_FACILITIES.filter((f) => f.hubId === hubId)

export const getHelplinesByState = (state?: NEState): Helpline[] =>
  state ? NE_HELPLINES.filter((h) => !h.state || h.state === state) : NE_HELPLINES

export const MOCK_INCIDENTS_BY_HUB: Record<string, import('@/types').Incident[]> = {
  guwahati: [
    {
      id: 'i001', category: 'Flood', severity: 'High',
      hubId: 'guwahati', state: 'Assam',
      description: 'Brahmaputra embankment breach near Panbazar area, water entering residential zones',
      lat: 26.1854, lng: 91.7513,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      verified: true, reporterType: 'official',
    },
    {
      id: 'i002', category: 'Roadblock', severity: 'Moderate',
      hubId: 'guwahati', state: 'Assam',
      description: 'NH-27 blocked at Jalukbari due to waterlogging',
      lat: 26.1537, lng: 91.6887,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      verified: false, reporterType: 'community',
    },
  ],
  shillong: [
    {
      id: 'i003', category: 'Landslide', severity: 'High',
      hubId: 'shillong', state: 'Meghalaya',
      description: 'Major landslide on Shillong-Cherrapunji road, NH-6 blocked completely',
      lat: 25.5513, lng: 91.8794,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      verified: true, reporterType: 'official',
    },
  ],
  gangtok: [
    {
      id: 'i004', category: 'Landslide', severity: 'Critical',
      hubId: 'gangtok', state: 'Sikkim',
      description: 'Glacial lake outburst flood risk — NH-10 blocked, evacuation in progress',
      lat: 27.3271, lng: 88.5984,
      timestamp: new Date(Date.now() - 900000).toISOString(),
      verified: true, reporterType: 'official',
    },
  ],
}
