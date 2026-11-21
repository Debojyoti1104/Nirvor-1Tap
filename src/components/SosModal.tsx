'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  X, MapPin, Phone, Share2, Copy, CheckCircle,
  AlertTriangle, ChevronRight, ExternalLink,
} from 'lucide-react'
import type { Hub, SosIncidentType } from '@/types'
import {
  encodeSosPacket,
  decodeSosPacket,
  SOS_INCIDENT_TYPES,
  PEOPLE_COUNT_LABELS,
  SAMPLE_PACKET,
} from '@/lib/sosCodec'
import QRCode from 'qrcode'

interface SosModalProps {
  open: boolean
  onClose: () => void
  hub: Hub
}

type ModalTab = 'send' | 'decode'

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
  { label: 'Ambulance', number: '108', primary: false },
  { label: 'Police', number: '100', primary: false },
  { label: 'Fire Brigade', number: '101', primary: false },
]

export default function SosModal({ open, onClose, hub }: SosModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('send')

  // ── Geo ──────────────────────────────────────────────────────────────────
  const [geo, setGeo] = useState<GeolocationState>({
    lat: null, lng: null, accuracy: null, status: 'idle',
  })

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ lat: hub.lat, lng: hub.lng, accuracy: null, status: 'error' })
      return
    }
    setGeo(prev => ({ ...prev, status: 'loading' }))
    navigator.geolocation.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, status: 'success' }),
      () => setGeo({ lat: hub.lat, lng: hub.lng, accuracy: null, status: 'denied' }),
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [hub])

  useEffect(() => {
    if (open) { getLocation(); setActiveTab('send') }
    else setGeo({ lat: null, lng: null, accuracy: null, status: 'idle' })
  }, [open, getLocation])

  // ── Packet builder state ──────────────────────────────────────────────────
  const [incidentType, setIncidentType] = useState<SosIncidentType>('Flood')
  const [peopleCount, setPeopleCount] = useState<1 | 2 | 3>(1)
  const [medicalAid, setMedicalAid] = useState(false)
  const [copiedPacket, setCopiedPacket] = useState(false)
  const [copiedCoords, setCopiedCoords] = useState(false)

  const lat = geo.lat ?? hub.lat
  const lng = geo.lng ?? hub.lng
  const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`

  let sosPacket = ''
  try {
    sosPacket = encodeSosPacket({ incidentType, peopleCount, medicalAidNeeded: medicalAid, lat, lng })
  } catch {
    sosPacket = 'NE1:--:ERROR'
  }

  const whatsappText = encodeURIComponent(
    `SOS EMERGENCY — Northeast Connect\n\nPacket: ${sosPacket}\nLocation: ${coordStr}\nHub: ${hub.name}, ${hub.state}\nMaps: ${mapsLink}\n\nSend help immediately.`
  )
  const smsBody = encodeURIComponent(`${sosPacket} ${mapsLink}`)

  const handleCopyPacket = async () => {
    try { await navigator.clipboard.writeText(sosPacket); setCopiedPacket(true); setTimeout(() => setCopiedPacket(false), 2500) }
    catch { /* ignore */ }
  }
  const handleCopyCoords = async () => {
    try { await navigator.clipboard.writeText(`${coordStr}\n${mapsLink}`); setCopiedCoords(true); setTimeout(() => setCopiedCoords(false), 2500) }
    catch { /* ignore */ }
  }

  // ── Decoder state ─────────────────────────────────────────────────────────
  const [decodeInput, setDecodeInput] = useState('')
  const [decodeResult, setDecodeResult] = useState<ReturnType<typeof decodeSosPacket> | null>(null)
  const [decodeError, setDecodeError] = useState<string | null>(null)

  const handleDecode = (value: string) => {
    setDecodeInput(value)
    if (!value.trim()) { setDecodeResult(null); setDecodeError(null); return }
    try {
      setDecodeResult(decodeSosPacket(value))
      setDecodeError(null)
    } catch (e) {
      setDecodeResult(null)
      setDecodeError(e instanceof Error ? e.message : 'Invalid packet')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-red-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span className="font-bold text-white text-sm tracking-wider">SOS EMERGENCY</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-red-700 transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 text-xs font-semibold py-2.5 transition-colors border-b-2 ${
              activeTab === 'send'
                ? 'border-red-600 text-red-600 bg-red-50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Send SOS
          </button>
          <button
            onClick={() => setActiveTab('decode')}
            className={`flex-1 text-xs font-semibold py-2.5 transition-colors border-b-2 ${
              activeTab === 'decode'
                ? 'border-slate-800 text-slate-800 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Decode Packet
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {activeTab === 'send' ? (
            <SendSosTab
              geo={geo}
              hub={hub}
              coordStr={coordStr}
              mapsLink={mapsLink}
              incidentType={incidentType}
              setIncidentType={setIncidentType}
              peopleCount={peopleCount}
              setPeopleCount={setPeopleCount}
              medicalAid={medicalAid}
              setMedicalAid={setMedicalAid}
              sosPacket={sosPacket}
              whatsappText={whatsappText}
              smsBody={smsBody}
              copiedPacket={copiedPacket}
              copiedCoords={copiedCoords}
              onCopyPacket={handleCopyPacket}
              onCopyCoords={handleCopyCoords}
            />
          ) : (
            <DecodeTab
              decodeInput={decodeInput}
              decodeResult={decodeResult}
              decodeError={decodeError}
              onDecode={handleDecode}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Send SOS Tab ──────────────────────────────────────────────────────────
interface SendSosTabProps {
  geo: GeolocationState
  hub: Hub
  coordStr: string
  mapsLink: string
  incidentType: SosIncidentType
  setIncidentType: (v: SosIncidentType) => void
  peopleCount: 1 | 2 | 3
  setPeopleCount: (v: 1 | 2 | 3) => void
  medicalAid: boolean
  setMedicalAid: (v: boolean) => void
  sosPacket: string
  whatsappText: string
  smsBody: string
  copiedPacket: boolean
  copiedCoords: boolean
  onCopyPacket: () => void
  onCopyCoords: () => void
}

function SendSosTab({
  geo, hub, coordStr, mapsLink,
  incidentType, setIncidentType,
  peopleCount, setPeopleCount,
  medicalAid, setMedicalAid,
  sosPacket, whatsappText, smsBody,
  copiedPacket, copiedCoords,
  onCopyPacket, onCopyCoords,
}: SendSosTabProps) {
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!sosPacket.startsWith('NE1:') || sosPacket.includes('ERROR')) {
      setQrDataUrl('')
      return
    }
    QRCode.toDataURL(sosPacket, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then(url => { if (!cancelled) setQrDataUrl(url) })
      .catch(() => { if (!cancelled) setQrDataUrl('') })
    return () => { cancelled = true }
  }, [sosPacket])

  return (
    <div className="p-4 space-y-4">
      {/* GPS Location */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5" />
            <span>Location</span>
          </div>
          {geo.status === 'denied' && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Hub Fallback</span>
          )}
          {geo.status === 'success' && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> GPS Locked
            </span>
          )}
        </div>
        <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
          {geo.status === 'loading'
            ? <span className="text-slate-400 animate-pulse">Acquiring GPS signal...</span>
            : coordStr
          }
        </div>
        {geo.accuracy && (
          <div className="font-mono text-xs text-slate-400 mt-0.5 tabular-nums">Accuracy: ±{Math.round(geo.accuracy)}m</div>
        )}
      </div>

      {/* ── Packet builder ──────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">2G / SMS Packet Builder</span>
        </div>
        <div className="p-3 space-y-3">
          {/* Incident type */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">Incident Type</label>
            <div className="grid grid-cols-5 gap-1">
              {SOS_INCIDENT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setIncidentType(t)}
                  className={`text-xs py-1.5 px-1 rounded border font-medium transition-colors leading-tight text-center ${
                    incidentType === t
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* People count */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">People Count</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setPeopleCount(n)}
                  className={`text-xs py-1.5 rounded border font-medium transition-colors ${
                    peopleCount === n
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {PEOPLE_COUNT_LABELS[n]}
                </button>
              ))}
            </div>
          </div>

          {/* Medical aid toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Medical Aid Needed</span>
            <button
              onClick={() => setMedicalAid(!medicalAid)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                medicalAid ? 'bg-red-500' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={medicalAid}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${medicalAid ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Live packet display */}
          <div className="bg-slate-900 rounded-lg px-3 py-2.5">
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Generated Packet</div>
            <div className="font-mono text-sm font-bold text-emerald-400 tracking-widest tabular-nums break-all">
              {sosPacket}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              {sosPacket.length} bytes · 2G/SMS safe
            </div>
          </div>

          {/* Offline rescue QR */}
          {qrDataUrl && (
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR code containing the SOS packet"
                width={72}
                height={72}
                className="w-[72px] h-[72px] flex-shrink-0 rounded border border-slate-100"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800">Offline rescue QR</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5">NO NETWORK</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  A rescue team can scan this offline. It encodes incident type, headcount, medical flag and GPS.
                </p>
                <a
                  href={qrDataUrl}
                  download={`sos-${sosPacket.replace(/[^A-Za-z0-9]/g, '-')}.png`}
                  className="inline-block text-[10px] font-semibold text-slate-700 underline mt-0.5"
                >
                  Save QR card
                </a>
              </div>
            </div>
          )}

          {/* Packet action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCopyPacket}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
            >
              {copiedPacket ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedPacket ? 'Copied!' : 'Copy Packet'}
            </button>
            <a
              href={`sms:?body=${smsBody}`}
              className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Open SMS
            </a>
          </div>
        </div>
      </div>

      {/* ── Emergency dial buttons ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">One-Tap Emergency Dial</p>
        <div className="grid grid-cols-2 gap-2">
          {EMERGENCY_CONTACTS.filter(c => c.primary).map(contact => (
            <a
              key={contact.number}
              href={`tel:${contact.number}`}
              className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 hover:bg-red-100 transition-colors group"
            >
              <div>
                <div className="text-xs text-red-700 font-medium">{contact.label}</div>
                <div className="font-mono font-bold text-red-600 text-lg tabular-nums">{contact.number}</div>
              </div>
              <Phone className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
            </a>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          {EMERGENCY_CONTACTS.filter(c => !c.primary).map(contact => (
            <a
              key={contact.number}
              href={`tel:${contact.number}`}
              className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-lg p-2 hover:bg-slate-100 transition-colors text-center"
            >
              <span className="text-xs text-slate-500 font-medium leading-tight">{contact.label}</span>
              <span className="font-mono font-bold text-slate-800 text-sm tabular-nums mt-0.5">{contact.number}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Share actions ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-xs rounded-lg px-3 py-2.5 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          WhatsApp SOS
        </a>
        <button
          onClick={onCopyCoords}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg px-3 py-2.5 transition-colors"
        >
          {copiedCoords ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copiedCoords ? 'Copied!' : 'Copy Coords'}
        </button>
      </div>

      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors pb-1"
      >
        <MapPin className="w-3 h-3" />
        Open in Google Maps
      </a>
    </div>
  )
}

// ─── Decode Packet Tab ─────────────────────────────────────────────────────
interface DecodeTabProps {
  decodeInput: string
  decodeResult: ReturnType<typeof decodeSosPacket> | null
  decodeError: string | null
  onDecode: (v: string) => void
}

const INCIDENT_COLOR_MAP: Record<string, string> = {
  Flood: 'text-blue-700 bg-blue-50 border-blue-200',
  Landslide: 'text-amber-700 bg-amber-50 border-amber-200',
  Medical: 'text-rose-700 bg-rose-50 border-rose-200',
  Trapped: 'text-red-700 bg-red-50 border-red-200',
  Roadblock: 'text-orange-700 bg-orange-50 border-orange-200',
}

function DecodeTab({ decodeInput, decodeResult, decodeError, onDecode }: DecodeTabProps) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Paste NE1 Packet
          </label>
          <button
            onClick={() => onDecode(SAMPLE_PACKET)}
            className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
          >
            Load Sample
          </button>
        </div>
        <input
          type="text"
          value={decodeInput}
          onChange={e => onDecode(e.target.value)}
          placeholder="NE1:1A:26.1445,91.7362"
          className="w-full font-mono text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 tabular-nums"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {decodeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <div className="text-xs font-semibold text-red-600 mb-0.5">Invalid Packet</div>
          <div className="text-xs text-red-700 font-mono leading-snug">{decodeError}</div>
        </div>
      )}

      {decodeResult && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700">Decoded Successfully</span>
          </div>
          <div className="divide-y divide-slate-100">
            {/* Incident type */}
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Incident Type</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${INCIDENT_COLOR_MAP[decodeResult.incidentType] ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {decodeResult.incidentType}
              </span>
            </div>
            {/* People */}
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Headcount</span>
              <span className="text-xs font-semibold text-slate-900">{decodeResult.peopleCountLabel}</span>
            </div>
            {/* Medical */}
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Medical Aid</span>
              <span className={`text-xs font-bold ${decodeResult.medicalAidNeeded ? 'text-red-600' : 'text-emerald-600'}`}>
                {decodeResult.medicalAidNeeded ? 'REQUIRED' : 'Not required'}
              </span>
            </div>
            {/* Coordinates */}
            <div className="px-3 py-2.5">
              <span className="text-xs text-slate-500 font-medium block mb-1">Coordinates</span>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {decodeResult.lat.toFixed(4)}, {decodeResult.lng.toFixed(4)}
              </span>
            </div>
            {/* Raw */}
            <div className="px-3 py-2 bg-slate-900">
              <span className="font-mono text-xs text-slate-400 tracking-wide">Raw: </span>
              <span className="font-mono text-xs text-emerald-400 font-bold tracking-widest">{decodeResult.raw}</span>
            </div>
          </div>

          {/* Map links */}
          <div className="px-3 py-2.5 flex gap-2 bg-white border-t border-slate-100">
            <a
              href={`https://www.google.com/maps?q=${decodeResult.lat},${decodeResult.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Google Maps
            </a>
          </div>
        </div>
      )}

      {!decodeInput && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
          <div className="text-xs text-slate-500 font-medium mb-1">For rescue volunteers</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Paste any <span className="font-mono font-semibold text-slate-600">NE1:XX:lat,lng</span> packet received via SMS or radio to decode incident details and get a map link.
          </div>
        </div>
      )}
    </div>
  )
}
