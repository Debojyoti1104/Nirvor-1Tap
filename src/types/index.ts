// ─── Hub / State Types ─────────────────────────────────────────────────────
export type NEState =
  | 'Assam'
  | 'Meghalaya'
  | 'Arunachal Pradesh'
  | 'Manipur'
  | 'Mizoram'
  | 'Nagaland'
  | 'Tripura'
  | 'Sikkim'

export type TerrainType = 'valley_flood' | 'hilly_landslide' | 'mixed'

export interface Hub {
  id: string
  name: string
  state: NEState
  lat: number
  lng: number
  terrain: TerrainType
  elevation: number
  population: number
  floodZone: boolean
  landslideZone: boolean
}

// ─── Risk Engine Types ─────────────────────────────────────────────────────
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export interface WeatherData {
  rainfall: number
  precipitation24h: number
  windSpeed: number
  temperature: number
  humidity: number
  timestamp: string
  source: 'live' | 'fallback'
}

export interface RiskAssessment {
  score: number
  level: RiskLevel
  floodRisk: number
  landslideRisk: number
  earthquakeAlert: boolean
  primaryHazard: string
  advisoryText: string
  color: string
}

// ─── Incident Types ────────────────────────────────────────────────────────
export type IncidentCategory =
  | 'Flood'
  | 'Landslide'
  | 'Roadblock'
  | 'Power Outage'
  | 'Earthquake'
  | 'Medical Emergency'

export type IncidentSeverity = 'Low' | 'Moderate' | 'High' | 'Critical'

export interface Incident {
  id: string
  category: IncidentCategory
  severity: IncidentSeverity
  hubId: string
  state: NEState
  description: string
  lat?: number
  lng?: number
  timestamp: string
  verified: boolean
  reporterType: 'community' | 'official'
}

// ─── Relief Board Types ────────────────────────────────────────────────────
export type ReliefKind = 'need' | 'offer'
export type ReliefStatus = 'open' | 'claimed' | 'fulfilled'

export interface ReliefPost {
  id: string
  kind: ReliefKind
  category: string
  description: string
  name: string
  contact: string
  state: NEState
  hubId: string
  lat?: number
  lng?: number
  status: ReliefStatus
  claimedBy?: string
  createdAt: string
}

// ─── Shelter / Facility Types ──────────────────────────────────────────────
export type FacilityType = 'shelter' | 'hospital' | 'police' | 'fire'

export interface Facility {
  id: string
  name: string
  type: FacilityType
  hubId: string
  state: NEState
  lat: number
  lng: number
  address: string
  phone?: string
  capacity?: number
  currentOccupancy?: number
  verified: boolean
  distance?: number
}

// ─── Helpline Types ────────────────────────────────────────────────────────
export type HelplineCategory =
  | 'National Emergency'
  | 'State Disaster'
  | 'Medical'
  | 'Police'
  | 'Fire'
  | 'NDRF'
  | 'District Control'

export interface Helpline {
  id: string
  name: string
  number: string
  category: HelplineCategory
  state?: NEState
  hubId?: string
  available24x7: boolean
}

// ─── Checklist Types ───────────────────────────────────────────────────────
export type ChecklistType = 'flood' | 'landslide' | 'earthquake'

export interface ChecklistItem {
  id: string
  text: string
  critical: boolean
}

export interface Checklist {
  type: ChecklistType
  title: string
  items: ChecklistItem[]
}

// ─── SOS Codec Types ───────────────────────────────────────────────────────
export type SosIncidentType = 'Flood' | 'Landslide' | 'Medical' | 'Trapped' | 'Roadblock'

export interface SosPacketInput {
  incidentType: SosIncidentType
  peopleCount: 1 | 2 | 3 // 1=1 person, 2=2–4, 3=5+
  medicalAidNeeded: boolean
  lat: number
  lng: number
}

export interface SosPacketDecoded {
  incidentType: SosIncidentType
  peopleCountBucket: 1 | 2 | 3
  peopleCountLabel: string
  medicalAidNeeded: boolean
  lat: number
  lng: number
  raw: string
}
