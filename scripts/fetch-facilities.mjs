/**
 * Fetch emergency institutions across North East India from OpenStreetMap
 * (Overpass API) and write them to public/data/facilities.json.
 *
 * Free, no API key. Re-run with:  npm run data:facilities
 *
 * Sources: © OpenStreetMap contributors, ODbL 1.0.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

// south, west, north, east
const STATES = [
  { state: 'Assam', bbox: [23.95, 89.55, 28.05, 96.15] },
  { state: 'Arunachal Pradesh', bbox: [26.45, 91.45, 29.55, 97.55] },
  { state: 'Meghalaya', bbox: [24.95, 89.75, 26.25, 92.95] },
  { state: 'Manipur', bbox: [23.75, 92.95, 25.75, 94.85] },
  { state: 'Mizoram', bbox: [21.85, 92.15, 24.55, 93.55] },
  { state: 'Nagaland', bbox: [25.05, 93.25, 27.15, 95.45] },
  { state: 'Tripura', bbox: [22.85, 91.05, 24.65, 92.45] },
  { state: 'Sikkim', bbox: [26.95, 87.95, 28.25, 89.05] },
]

// District hubs used to assign each facility to the nearest operational hub.
const HUBS = [
  { id: 'guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { id: 'silchar', state: 'Assam', lat: 24.8333, lng: 92.7789 },
  { id: 'jorhat', state: 'Assam', lat: 26.7509, lng: 94.2037 },
  { id: 'barpeta', state: 'Assam', lat: 26.3226, lng: 91.0044 },
  { id: 'haflong', state: 'Assam', lat: 25.1667, lng: 93.0167 },
  { id: 'shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933 },
  { id: 'tura', state: 'Meghalaya', lat: 25.514, lng: 90.2021 },
  { id: 'itanagar', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053 },
  { id: 'tawang', state: 'Arunachal Pradesh', lat: 27.5859, lng: 91.8594 },
  { id: 'namsai', state: 'Arunachal Pradesh', lat: 27.6694, lng: 95.8636 },
  { id: 'imphal', state: 'Manipur', lat: 24.817, lng: 93.9368 },
  { id: 'churachandpur', state: 'Manipur', lat: 24.3333, lng: 93.6833 },
  { id: 'aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176 },
  { id: 'lunglei', state: 'Mizoram', lat: 22.8879, lng: 92.7356 },
  { id: 'champhai', state: 'Mizoram', lat: 23.4728, lng: 93.3256 },
  { id: 'kohima', state: 'Nagaland', lat: 25.6751, lng: 94.1086 },
  { id: 'wokha', state: 'Nagaland', lat: 26.0972, lng: 94.2575 },
  { id: 'agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868 },
  { id: 'kailashahar', state: 'Tripura', lat: 24.3333, lng: 92.0167 },
  { id: 'gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065 },
  { id: 'namchi', state: 'Sikkim', lat: 27.1667, lng: 88.35 },
]

const TYPES = ['hospital', 'clinic', 'police', 'fire', 'ambulance', 'shelter']

function classify(tags = {}) {
  if (tags.emergency === 'ambulance_station' || tags.amenity === 'ambulance_station') return 'ambulance'
  if (tags.amenity === 'police') return 'police'
  if (tags.amenity === 'fire_station') return 'fire'
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'hospital'
  if (['clinic', 'doctors', 'health_post', 'dentist'].includes(tags.amenity)) return 'clinic'
  if (tags.healthcare === 'clinic' || tags.healthcare === 'doctor') return 'clinic'
  if (tags.amenity === 'shelter' || tags.social_facility === 'shelter') return 'shelter'
  if (tags.emergency === 'assembly_point') return 'shelter'
  return null
}

function pickName(tags = {}) {
  const candidates = [
    tags['name:en'],
    tags.name,
    tags['name:hi'],
    tags.official_name,
    tags.operator,
  ]
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 1)
  return found ? found.replace(/\s+/g, ' ').trim().slice(0, 90) : null
}

function pickAddress(tags = {}) {
  if (tags['addr:full']) return tags['addr:full'].replace(/\s+/g, ' ').trim().slice(0, 90)
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:district'],
    tags['addr:state'],
  ].filter(Boolean)
  return parts.join(', ').replace(/\s+/g, ' ').trim().slice(0, 90)
}

function pickPhone(tags = {}) {
  const raw = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags.mobile
  if (!raw) return ''
  const first = String(raw).split(/[;,]/)[0].replace(/\s+/g, '')
  return /^[+0-9()-]{6,20}$/.test(first) ? first : ''
}

function nearestHub(lat, lng) {
  let best = HUBS[0]
  let bestD = Infinity
  for (const hub of HUBS) {
    // Equirectangular is accurate enough at district scale.
    const dx = (lng - hub.lng) * Math.cos((lat * Math.PI) / 180)
    const dy = lat - hub.lat
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = hub
    }
  }
  return best
}

function queryFor(bbox) {
  const box = bbox.join(',')
  return `[out:json][timeout:180];
(
  nwr["amenity"~"^(hospital|clinic|doctors|police|fire_station|ambulance_station|shelter)$"](${box});
  nwr["healthcare"~"^(hospital|clinic|doctor)$"](${box});
  nwr["emergency"="ambulance_station"](${box});
  nwr["emergency"="assembly_point"](${box});
  nwr["social_facility"="shelter"](${box});
);
out center tags;`
}

async function overpass(query) {
  let lastError
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length]
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Nirvor-1Tap/1.0 (community emergency map; data build)',
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`)
      const text = await res.text()
      if (text.trimStart().startsWith('<')) throw new Error('non-JSON response (busy?)')
      return JSON.parse(text)
    } catch (error) {
      lastError = error
      console.warn(`  retry ${attempt + 1}: ${error.message}`)
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)))
    }
  }
  throw lastError
}

const seenOsm = new Set()
const seenGeo = new Set()
const facilities = []
const counts = {}

for (const { state, bbox } of STATES) {
  process.stdout.write(`Fetching ${state} ... `)
  const data = await overpass(queryFor(bbox))
  let kept = 0
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {}
    const type = classify(tags)
    if (!type) continue
    const name = pickName(tags)
    if (!name) continue
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (typeof lat !== 'number' || typeof lng !== 'number') continue

    const osmKey = `${el.type}/${el.id}`
    if (seenOsm.has(osmKey)) continue
    seenOsm.add(osmKey)

    // Collapse duplicates mapped twice (e.g. a node and its building way).
    const geoKey = `${type}|${name.toLowerCase()}|${lat.toFixed(3)}|${lng.toFixed(3)}`
    if (seenGeo.has(geoKey)) continue
    seenGeo.add(geoKey)

    const hub = nearestHub(lat, lng)
    facilities.push({
      id: `osm-${type[0]}-${el.type[0]}${el.id}`,
      name,
      type,
      state,
      hubId: hub.id,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      address: pickAddress(tags),
      phone: pickPhone(tags),
      verified: false,
      source: 'osm',
    })
    counts[type] = (counts[type] ?? 0) + 1
    kept++
  }
  console.log(`${kept} (raw ${data.elements?.length ?? 0})`)
  await new Promise((r) => setTimeout(r, 2500))
}

facilities.sort((a, b) => a.state.localeCompare(b.state) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name))

const outDir = path.join(process.cwd(), 'public', 'data')
await mkdir(outDir, { recursive: true })
const payload = {
  generatedAt: new Date().toISOString(),
  source: 'OpenStreetMap via Overpass API',
  license: 'ODbL 1.0 — © OpenStreetMap contributors',
  count: facilities.length,
  byType: counts,
  states: STATES.map((s) => s.state),
  facilities,
}
const file = path.join(outDir, 'facilities.json')
await writeFile(file, JSON.stringify(payload), 'utf8')

console.log('\nTotal:', facilities.length)
console.log(counts)
console.log('Written:', file, `(${(JSON.stringify(payload).length / 1024).toFixed(0)} KB)`)
