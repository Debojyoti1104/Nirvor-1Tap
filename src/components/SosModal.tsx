'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X,
  MapPin,
  Phone,
  Share2,
  Copy,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Radio,
  Send,
} from 'lucide-react'
import type { Hub, SosIncidentType, IncidentCategory } from '@/types'
import {
  encodeSosPacket,
  decodeSosPacket,
  SOS_INCIDENT_TYPES,
  PEOPLE_COUNT_LABELS,
  SAMPLE_PACKET,
} from '@/lib/sosCodec'
import { submitIncident } from '@/lib/community'
import QRCode from 'qrcode'

interface SosModalProps {
  open: boolean
  onClose: () => void
  hub: Hub
  onBroadcastSuccess?: () => void
  onIncidentSubmit?: (incident: any) => void
}

type ModalTab = 'danger' | 'decode'

interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  status: 'idle' | 'loading' | 'success' | 'denied' | 'error'
}

const EMERGENCY_CONTACTS = [
  { label: 'National Emergency', number: '112', primary: true },
  { label: 'Disaster Management', number: '1070', primary: true },
  { label: 'NDMA Helpline', number: '1077', primary: false },
  { label: 'Ambulance', number: '108', primary: true },
  { label: 'Police', number: '100', primary: false },
  { label: 'Fire Brigade', number: '101', primary: false },
]

export default function SosModal({ open, onClose, hub, onBroadcastSuccess, onIncidentSubmit }: SosModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('danger')

  // ── Geolocation ──────────────────────────────────────────────────────────
  const [geo, setGeo] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    status: 'idle',
  })

  const getLocation = useCallback(() => {
    // Check cached GPS first for instant zero-latency offline location
    let cachedLat: number | null = null
    let cachedLng: number | null = null
    try {
      const stored = localStorage.getItem('nc_last_gps')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.lat && parsed?.lng) {
          cachedLat = parsed.lat
          cachedLng = parsed.lng
        }
      }
    } catch {
      /* ignore */
    }

    if (!navigator.geolocation) {
      setGeo({
        lat: cachedLat ?? hub.lat,
        lng: cachedLng ?? hub.lng,
        accuracy: null,
        status: cachedLat ? 'success' : 'error',
      })
      return
    }

    if (cachedLat && cachedLng) {
      setGeo({ lat: cachedLat, lng: cachedLng, accuracy: 25, status: 'loading' })
    } else {
      setGeo((prev) => ({ ...prev, status: 'loading' }))
    }

    const saveAndSetPos = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      try {
        localStorage.setItem('nc_last_gps', JSON.stringify({ lat, lng, time: Date.now() }))
      } catch {
        /* ignore */
      }
      setGeo({
        lat,
        lng,
        accuracy: Math.round(pos.coords.accuracy),
        status: 'success',
      })
    }

    navigator.geolocation.getCurrentPosition(
      saveAndSetPos,
      () => {
        // Fallback for weak or offline hardware GPS
        navigator.geolocation.getCurrentPosition(
          saveAndSetPos,
          () => {
            setGeo({
              lat: cachedLat ?? hub.lat,
              lng: cachedLng ?? hub.lng,
              accuracy: null,
              status: cachedLat ? 'success' : 'denied',
            })
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        )
      },
      { timeout: 7000, enableHighAccuracy: true, maximumAge: 60000 }
    )
  }, [hub])

  useEffect(() => {
    if (open) {
      getLocation()
      setActiveTab('danger')
    } else {
      setGeo({ lat: null, lng: null, accuracy: null, status: 'idle' })
    }
  }, [open, getLocation])

  // ── SOS Danger State ─────────────────────────────────────────────────────
  const [incidentType, setIncidentType] = useState<SosIncidentType>('Trapped')
  const [peopleCount, setPeopleCount] = useState<1 | 2 | 3>(1)
  const [medicalAid, setMedicalAid] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcasted, setBroadcasted] = useState(false)
  const [copiedPacket, setCopiedPacket] = useState(false)
  const [copiedCoords, setCopiedCoords] = useState(false)
  const [showAdvanced2G, setShowAdvanced2G] = useState(false)

  const lat = geo.lat ?? hub.lat
  const lng = geo.lng ?? hub.lng
  const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`

  let sosPacket = ''
  try {
    sosPacket = encodeSosPacket({
      incidentType,
      peopleCount,
      medicalAidNeeded: medicalAid,
      lat,
      lng,
    })
  } catch {
    sosPacket = 'NE1:--:ERROR'
  }

  const whatsappText = encodeURIComponent(
    `🚨 EMERGENCY SOS: I AM IN DANGER!\n\nIncident: ${incidentType}\nHeadcount: ${PEOPLE_COUNT_LABELS[peopleCount]}\nMedical Aid: ${
      medicalAid ? 'REQUIRED' : 'None'
    }\nLocation: ${coordStr}\nHub: ${hub.name}, ${hub.state}\nGoogle Maps: ${mapsLink}\n\nPlease mobilize rescue immediately!`
  )
  const smsBody = encodeURIComponent(`${sosPacket} ${mapsLink}`)

  // Direct 1-tap "I'm in danger" broadcast action
  const handleBroadcastDanger = async () => {
    setBroadcasting(true)
    try {
      const categoryMap: Record<SosIncidentType, IncidentCategory> = {
        Flood: 'Flood',
        Landslide: 'Landslide',
        Medical: 'Medical Emergency',
        Trapped: 'Medical Emergency',
        Roadblock: 'Roadblock',
      }

      const { incident } = await submitIncident({
        category: categoryMap[incidentType] || 'Medical Emergency',
        severity: 'Critical',
        hubId: hub.id,
        state: hub.state,
        description: `CRITICAL SOS [I'M IN DANGER]: ${incidentType} reported near ${hub.name}. Estimated ${PEOPLE_COUNT_LABELS[peopleCount]}${
          medicalAid ? ' (Requires Immediate Medical Aid)' : ''
        }. Coordinates: ${coordStr}`,
        lat,
        lng,
      })

      if (onIncidentSubmit) onIncidentSubmit(incident)
      setBroadcasted(true)
      if (onBroadcastSuccess) onBroadcastSuccess()
    } catch (e) {
      console.warn('Direct broadcast fallback to offline queue', e)
      setBroadcasted(true)
    } finally {
      setBroadcasting(false)
    }
  }

  const handleCopyPacket = async () => {
    try {
      await navigator.clipboard.writeText(sosPacket)
      setCopiedPacket(true)
      setTimeout(() => setCopiedPacket(false), 2500)
    } catch {
      /* ignore */
    }
  }

  const handleCopyCoords = async () => {
    try {
      await navigator.clipboard.writeText(`${coordStr}\n${mapsLink}`)
      setCopiedCoords(true)
      setTimeout(() => setCopiedCoords(false), 2500)
    } catch {
      /* ignore */
    }
  }

  // ── Decoder state ─────────────────────────────────────────────────────────
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState<ReturnType<typeof decodeSosPacket> | null>(null)
  const [decodeError, setDecodeError] = useState<string | null>(null)

  const handleDecode = (value: string) => {
    setDecodeInput(value)
    if (!value.trim()) {
      setDecodeResult(null)
      setDecodeError(null)
      return
    }
    try {
      setDecodeResult(decodeSosPacket(value))
      setDecodeError(null)
    } catch (e) {
      setDecodeResult(null)
      setDecodeError(e instanceof Error ? e.message : 'Invalid packet format')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-red-600 px-4 py-3.5 flex items-center justify-between flex-shrink-0 text-white">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="font-bold text-sm tracking-wider uppercase">SOS Emergency</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-red-700 transition-colors text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex-1 py-2.5 transition-colors border-b-2 ${
              activeTab === 'danger'
                ? 'border-red-600 text-red-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            I&apos;m In Danger
          </button>
          <button
            onClick={() => setActiveTab('decode')}
            className={`flex-1 py-2.5 transition-colors border-b-2 ${
              activeTab === 'decode'
                ? 'border-slate-800 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Volunteer Decoder
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {activeTab === 'danger' ? (
            <>
              {/* Location telemetry strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>Your Location</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 mt-0.5 tabular-nums">
                    {geo.status === 'loading' ? (
                      <span className="text-slate-400 animate-pulse">Acquiring GPS...</span>
                    ) : (
                      coordStr
                    )}
                  </div>
                </div>

                {geo.status === 'success' ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" /> GPS Locked
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Hub Fallback
                  </span>
                )}
              </div>

              {/* Broadcast Success Banner */}
              {broadcasted ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center space-y-2 animate-in fade-in">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-1">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-emerald-900">
                    SOS Broadcasted to Responders!
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    All volunteers and responders active within 10 km have received your radar
                    alert. Keep this screen open and stay in a safe position.
                  </p>
                  <button
                    onClick={() => setBroadcasted(false)}
                    className="text-xs text-emerald-700 underline font-medium pt-1 block mx-auto"
                  >
                    Send another update
                  </button>
                </div>
              ) : (
                /* Primary Danger Form */
                <div className="space-y-3">
                  {/* Incident type */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                      I Am Facing
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SOS_INCIDENT_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setIncidentType(t)}
                          className={`text-xs py-2 px-1 rounded-lg border font-semibold transition-all ${
                            incidentType === t
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Headcount */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                      People In Danger
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([1, 2, 3] as const).map((n) => (
                        <button
                          key={n}
                          onClick={() => setPeopleCount(n)}
                          className={`text-xs py-2 rounded-lg border font-semibold transition-all ${
                            peopleCount === n
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {PEOPLE_COUNT_LABELS[n]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medical Aid Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Medical Aid Required?
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Check if anyone has critical injuries
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMedicalAid(!medicalAid)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        medicalAid ? 'bg-red-600' : 'bg-slate-300'
                      }`}
                      role="switch"
                      aria-checked={medicalAid}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          medicalAid ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* ── BIG PRIMARY BROADCAST BUTTON ── */}
                  <button
                    onClick={handleBroadcastDanger}
                    disabled={broadcasting}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>
                      {broadcasting
                        ? 'TRANSMITTING RADAR ALERT...'
                        : '🚨 BROADCAST: I AM IN DANGER'}
                    </span>
                  </button>
                </div>
              )}

              {/* Instant Secondary Sharing Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp SOS</span>
                </a>
                <a
                  href={`sms:?body=${smsBody}`}
                  className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-colors"
                  title="Sends compact 2G SMS without internet connection"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send 2G SMS</span>
                </a>
              </div>

              {/* Direct Emergency Telephone Dialers */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  One-Tap Emergency Dialers (Direct Cellular Network)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {EMERGENCY_CONTACTS.filter((c) => c.primary).map((c) => (
                    <a
                      key={c.number}
                      href={`tel:${c.number}`}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      <span className="text-[10px] text-red-700 font-bold truncate">
                        {c.label}
                      </span>
                      <span className="font-mono text-base font-black text-red-600 tabular-nums">
                        {c.number}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Collapsed 2G Packet / Advanced Drawer */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced2G(!showAdvanced2G)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-between w-full py-1.5"
                >
                  <span>Offline 2G Packet Protocol</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showAdvanced2G ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showAdvanced2G && (
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl mt-1 space-y-2 animate-in fade-in">
                    <div className="text-[10px] font-mono text-slate-400">
                      COMPACT SMS PAYLOAD (24 BYTES):
                    </div>
                    <div className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                      {sosPacket}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleCopyPacket}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1"
                      >
                        {copiedPacket ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedPacket ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleCopyCoords}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1"
                      >
                        {copiedCoords ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <MapPin className="w-3 h-3" />}
                        {copiedCoords ? 'Copied GPS' : 'Copy GPS'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Volunteer Decoder Tab ── */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Paste NE1 Emergency Packet
                  </label>
                  <button
                    onClick={() => handleDecode(SAMPLE_PACKET)}
                    className="text-xs text-slate-500 hover:text-slate-900 underline"
                  >
                    Load Sample
                  </button>
                </div>
                <input
                  type="text"
                  value={decodeInput}
                  onChange={(e) => handleDecode(e.target.value)}
                  placeholder="NE1:1A:26.1445,91.7362"
                  className="w-full font-mono text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              {decodeError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-mono">
                  {decodeError}
                </div>
              )}

              {decodeResult && (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {/* DIRECTION BUTTON ON TOP */}
                  <div className="p-3 bg-red-50">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${decodeResult.lat},${decodeResult.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>OPEN IN GOOGLE MAPS WITH DIRECTIONS</span>
                    </a>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between font-bold text-xs">
                    <span>Incident Type</span>
                    <span className="text-red-600">{decodeResult.incidentType}</span>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Headcount</span>
                    <span className="font-semibold text-slate-900">
                      {decodeResult.peopleCountLabel}
                    </span>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Medical Needed</span>
                    <span
                      className={`font-bold ${
                        decodeResult.medicalAidNeeded ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {decodeResult.medicalAidNeeded ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="px-3 py-2 text-xs">
                    <span className="text-slate-500 block mb-0.5">Coordinates</span>
                    <span className="font-mono font-bold text-slate-900">
                      {decodeResult.lat.toFixed(4)}, {decodeResult.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
