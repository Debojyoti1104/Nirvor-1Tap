'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Radio, Zap, ChevronDown, Plus, List, MapPin,
  HeartHandshake, ShieldCheck, Accessibility, Languages,
} from 'lucide-react'
import type { Hub, Incident, ReliefKind, ReliefPost, RiskAssessment, WeatherData } from '@/types'
import {
  NE_HUBS, NE_STATES, DEFAULT_HUB,
  getFacilitiesByHub, getHubsByState, MOCK_INCIDENTS_BY_HUB,
} from '@/data/neData'
import { fetchWeatherData, computeRiskAssessment } from '@/lib/riskEngine'
import {
  broadcastChange, fetchIncidents, fetchRelief, setIncidentVerified,
} from '@/lib/community'
import BrandLogo from '@/components/BrandLogo'
import TelemetryStrip from '@/components/TelemetryStrip'
import AlertBar from '@/components/AlertBar'
import SosModal from '@/components/SosModal'
import IncidentReporter from '@/components/IncidentReporter'
import HelplineDirectory from '@/components/HelplineDirectory'
import DisasterChecklist from '@/components/DisasterChecklist'
import TriageCards from '@/components/TriageCards'
import ReliefBoard from '@/components/ReliefBoard'
import DemoBadge from '@/components/DemoBadge'
import TranslateMenu from '@/components/TranslateMenu'
import InstallButton from '@/components/InstallButton'
import OfflineBanner from '@/components/OfflineBanner'

const EmergencyMap = dynamic(() => import('@/components/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center" style={{ height: '450px' }}>
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-slate-400">Loading map...</p>
      </div>
    </div>
  ),
})

type ActiveTab = 'map' | 'helplines' | 'checklist'

const TAB_LABELS: Record<ActiveTab, string> = {
  map: 'Live Map', helplines: 'Helplines', checklist: 'Checklists',
}

const EMPTY_RISK: RiskAssessment = {
  score: 0, level: 'LOW', floodRisk: 0, landslideRisk: 0,
  earthquakeAlert: false, primaryHazard: 'None', advisoryText: 'Loading weather data...',
  color: '#059669',
}
const EMPTY_WEATHER: WeatherData = {
  rainfall: 0, precipitation24h: 0, windSpeed: 0,
  temperature: 25, humidity: 70,
  timestamp: new Date().toISOString(), source: 'fallback',
}

export default function HomePage() {
  const [selectedHub, setSelectedHub] = useState<Hub>(DEFAULT_HUB)
  const [selectedState, setSelectedState] = useState(DEFAULT_HUB.state)
  const [lowBandwidth, setLowBandwidth] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [reporterOpen, setReporterOpen] = useState(false)
  const [reliefOpen, setReliefOpen] = useState(false)
  const [reliefMode, setReliefMode] = useState<ReliefKind>('need')
  const [activeTab, setActiveTab] = useState<ActiveTab>('map')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [serverIncidents, setServerIncidents] = useState<Incident[]>([])
  const [relief, setRelief] = useState<ReliefPost[]>([])
  const [syncStatus, setSyncStatus] = useState<'supabase' | 'memory' | 'offline'>('offline')
  const [responderMode, setResponderMode] = useState(false)

  // ── Accessibility / emergency mode ───────────────────────────────────────
  useEffect(() => {
    setEmergencyMode(localStorage.getItem('nc_emergency') === '1')
    setLowBandwidth(localStorage.getItem('nc_lowbw') === '1')
  }, [])

  useEffect(() => {
    document.documentElement.dataset.emergency = emergencyMode ? 'true' : 'false'
    localStorage.setItem('nc_emergency', emergencyMode ? '1' : '0')
  }, [emergencyMode])

  useEffect(() => {
    localStorage.setItem('nc_lowbw', lowBandwidth ? '1' : '0')
  }, [lowBandwidth])

  // ── Community data (Supabase-backed, cached offline) ─────────────────────
  const loadCommunity = useCallback(async () => {
    const [inc, rel] = await Promise.all([fetchIncidents(), fetchRelief()])
    setServerIncidents(inc.incidents)
    setRelief(rel.posts)
    setSyncStatus(!inc.live ? 'offline' : inc.database ? 'supabase' : 'memory')
  }, [])

  useEffect(() => {
    loadCommunity()
    const interval = setInterval(() => {
      if (!document.hidden) loadCommunity()
    }, 5000)

    const onVisible = () => { if (!document.hidden) loadCommunity() }
    document.addEventListener('visibilitychange', onVisible)

    let channel: BroadcastChannel | null = null
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('nc_community')
      channel.onmessage = () => loadCommunity()
    }

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      channel?.close()
    }
  }, [loadCommunity])

  // ── Weather ──────────────────────────────────────────────────────────────
  const loadWeather = useCallback(async () => {
    setWeatherLoading(true)
    try {
      const wd = await fetchWeatherData(selectedHub)
      setWeather(wd)
      setRisk(computeRiskAssessment(selectedHub, wd))
    } catch { /* riskEngine handles fallback */ }
    finally { setWeatherLoading(false) }
  }, [selectedHub])

  useEffect(() => {
    loadWeather()
    const id = setInterval(loadWeather, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadWeather])

  const handleStateChange = (state: string) => {
    const ne = state as typeof selectedState
    setSelectedState(ne)
    const hubs = getHubsByState(ne)
    if (hubs.length > 0) setSelectedHub(hubs[0])
  }

  const handleHubChange = (hubId: string) => {
    const hub = NE_HUBS.find(h => h.id === hubId)
    if (hub) setSelectedHub(hub)
  }

  const handleIncidentSubmit = (incident: Incident) => {
    setServerIncidents(prev => prev.some(i => i.id === incident.id) ? prev : [incident, ...prev])
    broadcastChange()
    loadCommunity()
  }

  const handleVerify = async (id: string, verified: boolean) => {
    setServerIncidents(prev => prev.map(i => i.id === id ? { ...i, verified } : i))
    const synced = await setIncidentVerified(id, verified)
    if (synced) {
      broadcastChange()
      loadCommunity()
    }
  }

  const openRelief = (mode: ReliefKind) => {
    setReliefMode(mode)
    setReliefOpen(true)
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const incidents = useMemo(() => {
    const demos = MOCK_INCIDENTS_BY_HUB[selectedHub.id] ?? []
    const real = serverIncidents.filter(i => i.hubId === selectedHub.id)
    return [...real, ...demos.filter(d => !real.some(r => r.id === d.id))]
  }, [selectedHub.id, serverIncidents])

  const facilities = getFacilitiesByHub(selectedHub.id)
  const verifiedShelters = facilities.filter(f => f.type === 'shelter' && f.verified).length
  const displayRisk = risk ?? EMPTY_RISK
  const displayWeather = weather ?? EMPTY_WEATHER
  const hubsForState = getHubsByState(selectedState)
  const openNeeds = relief.filter(p => p.kind === 'need' && p.status === 'open').length
  const hasDemoIncidents = incidents.some(i => i.id.startsWith('i0'))

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 h-14">
            <BrandLogo size={28} showWordmark={!lowBandwidth} className="flex-shrink-0" />

            <div className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${weatherLoading ? 'bg-amber-400 animate-pulse' : displayWeather.source === 'live' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-xs text-slate-400 font-mono hidden lg:block tabular-nums">
                {weatherLoading ? 'SYNCING' : displayWeather.source === 'live' ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="relative">
                <select value={selectedState} onChange={e => handleStateChange(e.target.value)}
                  aria-label="State"
                  className="text-xs font-semibold border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none cursor-pointer max-w-[110px] sm:max-w-none">
                  {NE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative hidden sm:block">
                <select value={selectedHub.id} onChange={e => handleHubChange(e.target.value)}
                  aria-label="Hub"
                  className="text-xs font-medium border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none cursor-pointer">
                  {hubsForState.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
              {risk && (
                <span className="hidden md:inline-flex text-xs font-bold px-2 py-1 rounded font-mono tabular-nums"
                  style={{ backgroundColor: `${risk.color}18`, color: risk.color }}>
                  {risk.level}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <TranslateMenu />
              <InstallButton />
              <button onClick={() => setLowBandwidth(p => !p)}
                className={`hidden lg:flex notranslate items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${lowBandwidth ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                title="Low-Bandwidth Mode: strips map and heavy visuals">
                <Radio className="w-3 h-3" />
                <span>Lo-BW</span>
              </button>
              <button onClick={() => setEmergencyMode(p => !p)}
                className={`hidden lg:flex notranslate items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${emergencyMode ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                title="Emergency mode: larger text, higher contrast"
                aria-pressed={emergencyMode}>
                <Accessibility className="w-3.5 h-3.5" />
                <span>A11y</span>
              </button>
              <button onClick={() => setSosOpen(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors">
                <Zap className="w-3.5 h-3.5" />
                <span>SOS</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <OfflineBanner />

      {risk && weather && <AlertBar risk={risk} hub={selectedHub} dataSource={weather.source} />}

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 space-y-4">

        <TriageCards
          onDanger={() => setSosOpen(true)}
          onNeed={() => openRelief('need')}
          onHelp={() => openRelief('offer')}
        />

        {!lowBandwidth ? (
          <TelemetryStrip risk={displayRisk} weather={displayWeather} communityReports={incidents.length} verifiedShelters={verifiedShelters} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 font-mono text-sm tabular-nums">
            <div className="flex flex-wrap gap-4 text-slate-700">
              <span>Risk: <strong style={{ color: displayRisk.color }}>{displayRisk.level} ({displayRisk.score}/100)</strong></span>
              <span>Rain: <strong>{displayWeather.precipitation24h.toFixed(1)}mm/24h</strong></span>
              <span>Wind: <strong>{displayWeather.windSpeed.toFixed(0)}km/h</strong></span>
              <span>Reports: <strong>{incidents.length}</strong></span>
              <span>Shelters: <strong>{verifiedShelters}</strong></span>
            </div>
          </div>
        )}

        {/* Relief board strip */}
        <button
          onClick={() => openRelief('need')}
          className="w-full flex items-center gap-2 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 rounded-lg px-3 py-2.5 transition-colors text-left"
        >
          <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <HeartHandshake className="w-4 h-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-slate-800">Community Relief Board</span>
            <span className="block text-[11px] text-slate-500">
              {openNeeds > 0 ? `${openNeeds} open request${openNeeds === 1 ? '' : 's'} across NE India` : 'No open requests yet — ask for help or offer it'}
            </span>
          </span>
          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1 flex-shrink-0">
            Open board
          </span>
        </button>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
            {(Object.keys(TAB_LABELS) as ActiveTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold px-3 py-2 transition-colors ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setResponderMode(p => !p)}
            className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-2 rounded-lg transition-colors ${responderMode ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
            title="Responder view: verify community reports">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Responder</span>
          </button>
          <button onClick={() => setEmergencyMode(p => !p)}
            className={`lg:hidden notranslate flex items-center gap-1.5 text-xs font-semibold border px-3 py-2 rounded-lg transition-colors ${emergencyMode ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
            title="Emergency mode: larger text, higher contrast"
            aria-pressed={emergencyMode}>
            <Accessibility className="w-3.5 h-3.5" />
            <span className="sr-only">Emergency mode</span>
          </button>
          <button onClick={() => setReporterOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Report Incident
          </button>
          <button onClick={() => setSosOpen(true)}
            className="sm:hidden flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-3 py-2 rounded-lg">
            <Zap className="w-3.5 h-3.5" /> SOS
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'map' && (
          <div className="space-y-3">
            <EmergencyMap hub={selectedHub} facilities={facilities} incidents={incidents} lowBandwidth={lowBandwidth} />
            {incidents.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                  <List className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Active Incidents — {selectedHub.name}</span>
                  {hasDemoIncidents && <DemoBadge compact />}
                  <span className="ml-auto font-mono text-xs text-slate-400 tabular-nums">{incidents.length} total</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {incidents.map(incident => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      responderMode={responderMode}
                      onVerify={handleVerify}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'helplines' && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">NE India Emergency Helplines</h2>
              <p className="text-xs text-slate-500 mt-0.5">All 8 states · 1-tap dialing · 24x7 availability</p>
            </div>
            <HelplineDirectory filterState={selectedHub.state} />
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">Disaster Readiness Checklists</h2>
              <p className="text-xs text-slate-500 mt-0.5">Progress saved locally · Flood, Landslide & Earthquake</p>
            </div>
            <DisasterChecklist />
          </div>
        )}

        {/* Hub details */}
        {!lowBandwidth && (
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hub Details — {selectedHub.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="State" value={selectedHub.state} />
              <Stat label="Terrain" value={selectedHub.terrain.replace('_', ' ')} />
              <Stat label="Elevation" value={`${selectedHub.elevation}m`} mono />
              <Stat label="Population" value={selectedHub.population.toLocaleString('en-IN')} mono />
              <Stat label="Flood Zone" value={selectedHub.floodZone ? 'Yes' : 'No'} danger={selectedHub.floodZone} />
              <Stat label="Landslide Zone" value={selectedHub.landslideZone ? 'Yes' : 'No'} danger={selectedHub.landslideZone} />
              <Stat label="Coordinates" value={`${selectedHub.lat.toFixed(4)}, ${selectedHub.lng.toFixed(4)}`} mono />
              <Stat label="Data Source" value={displayWeather.source === 'live' ? 'Open-Meteo Live' : 'Offline Fallback'} />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Nirvor-1Tap · Community Emergency Assistant · NE India
            <span className="mx-2">·</span>
            Data: Open-Meteo, OpenStreetMap
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${syncStatus === 'supabase' ? 'bg-emerald-500' : syncStatus === 'memory' ? 'bg-amber-400' : 'bg-slate-400'}`} />
            {syncStatus === 'supabase' ? 'Supabase sync active' : syncStatus === 'memory' ? 'Session sync — connect Supabase for persistence' : 'Offline — reports queued'}
            <span className="mx-1">·</span>
            <Languages className="w-3 h-3" /> 4 languages
            <span className="mx-1">·</span>
            Installable · Works offline
          </p>
          <p className="text-xs text-red-500 font-medium mt-1">
            For life-threatening emergencies, call 112 immediately
          </p>
        </footer>
      </main>

      {/* Modals */}
      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} hub={selectedHub} />
      <IncidentReporter
        open={reporterOpen}
        onClose={() => setReporterOpen(false)}
        currentHub={selectedHub}
        onIncidentSubmit={handleIncidentSubmit}
      />
      <ReliefBoard
        open={reliefOpen}
        onClose={() => setReliefOpen(false)}
        initialMode={reliefMode}
        currentHub={selectedHub}
        posts={relief}
        onChanged={loadCommunity}
      />
    </div>
  )
}

function IncidentRow({
  incident, responderMode, onVerify,
}: {
  incident: Incident
  responderMode: boolean
  onVerify: (id: string, verified: boolean) => void
}) {
  const sevColor = {
    Critical: 'text-red-600 bg-red-50 border-red-200',
    High: 'text-amber-600 bg-amber-50 border-amber-200',
    Moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    Low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  }[incident.severity] ?? 'text-slate-600 bg-slate-50 border-slate-200'

  const diff = Date.now() - new Date(incident.timestamp).getTime()
  const timeAgo = diff < 60000 ? 'just now' : diff < 3600000 ? `${Math.floor(diff / 60000)}m ago` : diff < 86400000 ? `${Math.floor(diff / 3600000)}h ago` : `${Math.floor(diff / 86400000)}d ago`
  const isDemo = incident.id.startsWith('i0')

  return (
    <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${sevColor}`}>{incident.severity}</span>
            <span className="text-xs font-medium text-slate-600">{incident.category}</span>
            {incident.verified && <span className="text-xs text-emerald-600 font-semibold">Verified</span>}
            {isDemo && <DemoBadge compact />}
          </div>
          <p className="text-xs text-slate-700 leading-snug">{incident.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="font-mono text-xs text-slate-400 tabular-nums">{timeAgo}</span>
          {responderMode && !incident.verified && !isDemo && (
            <button
              onClick={() => onVerify(incident.id, true)}
              className="text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded px-1.5 py-0.5"
            >
              Verify
            </button>
          )}
          {responderMode && incident.verified && !isDemo && (
            <button
              onClick={() => onVerify(incident.id, false)}
              className="text-[10px] font-medium text-slate-500 hover:text-slate-700 underline"
            >
              Unverify
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, mono, danger }: { label: string; value: string; mono?: boolean; danger?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${mono ? 'font-mono tabular-nums' : ''} ${danger ? 'text-red-600' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}
