'use client'

import { useState } from 'react'
import { X, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import type { IncidentCategory, IncidentSeverity, NEState, Hub, Incident } from '@/types'
import { NE_HUBS, NE_STATES } from '@/data/neData'
import { submitIncident } from '@/lib/community'

interface IncidentReporterProps {
  open: boolean
  onClose: () => void
  currentHub: Hub
  onIncidentSubmit: (incident: Incident) => void
}

const CATEGORIES: IncidentCategory[] = ['Flood', 'Landslide', 'Roadblock', 'Power Outage', 'Earthquake', 'Medical Emergency']
const SEVERITIES: IncidentSeverity[] = ['Low', 'Moderate', 'High', 'Critical']

const CAT_COLORS: Record<IncidentCategory, string> = {
  'Flood': 'bg-blue-50 border-blue-200 text-blue-700',
  'Landslide': 'bg-amber-50 border-amber-200 text-amber-700',
  'Roadblock': 'bg-orange-50 border-orange-200 text-orange-700',
  'Power Outage': 'bg-yellow-50 border-yellow-200 text-yellow-700',
  'Earthquake': 'bg-red-50 border-red-200 text-red-700',
  'Medical Emergency': 'bg-rose-50 border-rose-200 text-rose-700',
}

const SEV_COLORS: Record<IncidentSeverity, string> = {
  'Low': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Moderate': 'bg-yellow-50 border-yellow-200 text-yellow-700',
  'High': 'bg-orange-50 border-orange-200 text-orange-700',
  'Critical': 'bg-red-50 border-red-200 text-red-700',
}

export default function IncidentReporter({ open, onClose, currentHub, onIncidentSubmit }: IncidentReporterProps) {
  const [category, setCategory] = useState<IncidentCategory>('Flood')
  const [severity, setSeverity] = useState<IncidentSeverity>('Moderate')
  const [selectedState, setSelectedState] = useState<NEState>(currentHub.state)
  const [selectedHubId, setSelectedHubId] = useState(currentHub.id)
  const [description, setDescription] = useState('')
  const [attachGPS, setAttachGPS] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [queued, setQueued] = useState(false)

  const hubsForState = NE_HUBS.filter(h => h.state === selectedState)
  const selectedHub = NE_HUBS.find(h => h.id === selectedHubId) ?? currentHub

  const handleGPSToggle = () => {
    if (!attachGPS && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setAttachGPS(true) },
        () => { setGpsCoords({ lat: selectedHub.lat, lng: selectedHub.lng }); setAttachGPS(true) },
        { timeout: 5000 }
      )
    } else { setAttachGPS(false); setGpsCoords(null) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    setSubmitting(true)
    const { synced, incident } = await submitIncident({
      category,
      severity,
      hubId: selectedHubId,
      state: selectedState,
      description: description.trim(),
      lat: gpsCoords?.lat ?? selectedHub.lat,
      lng: gpsCoords?.lng ?? selectedHub.lng,
    })
    setQueued(!synced)
    onIncidentSubmit(incident)
    setSubmitting(false); setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setQueued(false); setDescription(''); setAttachGPS(false); setGpsCoords(null); onClose() }, 2200)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-900 text-sm">Report Incident</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {submitted ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3">
            {queued ? <AlertTriangle className="w-10 h-10 text-amber-500" /> : <CheckCircle className="w-10 h-10 text-emerald-500" />}
            <p className="font-semibold text-slate-900">{queued ? 'Saved Offline' : 'Incident Reported'}</p>
            <p className="text-sm text-slate-500 text-center">
              {queued
                ? 'No network right now. Your report is queued and will sync automatically when you reconnect.'
                : 'Your report has been submitted and plotted on the map for everyone.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Category</label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`text-xs font-medium px-2 py-2 rounded-lg border transition-colors ${category === cat ? CAT_COLORS[cat] : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Severity</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITIES.map(sev => (
                  <button key={sev} type="button" onClick={() => setSeverity(sev)}
                    className={`text-xs font-medium px-2 py-2 rounded-lg border transition-colors ${severity === sev ? SEV_COLORS[sev] : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    {sev}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">State</label>
                <select value={selectedState}
                  onChange={e => { const s = e.target.value as NEState; setSelectedState(s); const hubs = NE_HUBS.filter(h => h.state === s); if (hubs.length > 0) setSelectedHubId(hubs[0].id) }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {NE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Hub</label>
                <select value={selectedHubId} onChange={e => setSelectedHubId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {hubsForState.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description <span className="text-red-500">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe what you see — location details, affected areas, estimated severity..."
                rows={3} required
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Attach My GPS</p>
                  {gpsCoords && <p className="font-mono text-xs text-emerald-600 tabular-nums">{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</p>}
                </div>
              </div>
              <button type="button" onClick={handleGPSToggle}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${attachGPS ? 'bg-emerald-500' : 'bg-slate-300'}`}
                role="switch" aria-checked={attachGPS}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${attachGPS ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <button type="submit" disabled={submitting || !description.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors">
              {submitting ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
