'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Navigation,
  Compass,
  Clock,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  List,
} from 'lucide-react'
import type { Incident, Hub } from '@/types'
import { getDistanceKm, getGoogleMapsDirectionsUrl, getNativeGeoUri } from '@/lib/geoUtils'

interface ResponderDangerBubbleProps {
  responderLocation: { lat: number; lng: number } | null
  currentHub: Hub
  incidents: Incident[]
  responderMode: boolean
  onAcknowledge?: (incidentId: string) => void
}

export default function ResponderDangerBubble({
  responderLocation,
  currentHub,
  incidents,
  responderMode,
  onAcknowledge,
}: ResponderDangerBubbleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeVictimIndex, setActiveVictimIndex] = useState(0)
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)

  if (!responderMode) return null

  // Reference coordinates for responder (live GPS preferred, hub fallback)
  const refLat = responderLocation?.lat ?? currentHub.lat
  const refLng = responderLocation?.lng ?? currentHub.lng

  // Calculate distance for all unacknowledged incidents with coordinates
  const candidates = incidents
    .filter((inc) => inc.lat != null && inc.lng != null && !acknowledgedIds.includes(inc.id))
    .map((inc) => {
      const distKm = getDistanceKm(refLat, refLng, inc.lat!, inc.lng!)
      return { ...inc, distKm }
    })
    .sort((a, b) => a.distKm - b.distKm)

  if (candidates.length === 0 || dismissed) return null

  // Filter victims within 10 km responder radar
  const victimsWithin10Km = candidates.filter((c) => c.distKm <= 10)
  const activeVictims = victimsWithin10Km.length > 0 ? victimsWithin10Km : candidates.slice(0, 5)

  // Ensure index remains in bounds
  const safeIndex = Math.min(activeVictimIndex, Math.max(0, activeVictims.length - 1))
  const target = activeVictims[safeIndex]
  if (!target) return null

  const isWithin10Km = target.distKm <= 10
  const mapsUrl = getGoogleMapsDirectionsUrl(target.lat!, target.lng!, refLat, refLng)
  const geoUri = getNativeGeoUri(target.lat!, target.lng!, `Emergency: ${target.category}`)

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  }

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => [...prev, id])
    if (onAcknowledge) onAcknowledge(id)
    if (activeVictimIndex >= activeVictims.length - 1) {
      setActiveVictimIndex(Math.max(0, activeVictims.length - 2))
    }
  }

  const handlePrevVictim = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveVictimIndex((prev) => (prev > 0 ? prev - 1 : activeVictims.length - 1))
  }

  const handleNextVictim = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveVictimIndex((prev) => (prev < activeVictims.length - 1 ? prev + 1 : 0))
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm">
      {/* ── Hover Triage Preview Card ── */}
      {isHovered && !isModalOpen && (
        <div
          className="mb-2 bg-slate-900 border border-red-500/80 rounded-xl p-4 shadow-2xl text-white transition-all animate-in fade-in slide-in-from-bottom-2 duration-150"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* 1. DIRECTION BUTTON ON TOP OF MESSAGE */}
          <div className="mb-3">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span>
                {activeVictims.length > 1
                  ? `DIRECTIONS TO VICTIM #${safeIndex + 1} (${target.distKm.toFixed(1)} KM)`
                  : 'DIRECTIONS IN GOOGLE MAPS'}
              </span>
            </a>
          </div>

          {/* Multi-Victim Navigator if more than 1 victim */}
          {activeVictims.length > 1 && (
            <div className="flex items-center justify-between bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800 mb-2.5 text-xs">
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                VICTIM {safeIndex + 1} OF {activeVictims.length}
                {victimsWithin10Km.length > 0 ? ' (WITHIN 10KM)' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevVictim}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                  title="Previous victim"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextVictim}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white"
                  title="Next victim"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                {target.severity} {target.category}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {getTimeAgo(target.timestamp)}
            </span>
          </div>

          <p className="text-xs text-slate-200 line-clamp-2 mb-3 leading-relaxed">
            {target.description}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">PROXIMITY</span>
              <span className="font-bold text-amber-400 tabular-nums">
                {target.distKm.toFixed(1)} km away
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">GPS TARGET</span>
              <span className="text-slate-300 tabular-nums">
                {target.lat!.toFixed(3)}, {target.lng!.toFixed(3)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700 transition-colors"
            >
              <List className="w-3.5 h-3.5" />
              <span>
                {activeVictims.length > 1
                  ? `View All (${activeVictims.length}) Victims`
                  : 'View Full Telemetry'}
              </span>
            </button>
            <a
              href={geoUri}
              className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-2.5 rounded-lg border border-slate-700"
              title="Open offline geo: URI (OsmAnd / Maps.me)"
            >
              <Compass className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── Floating Danger Bubble ── */}
      <div
        className={`group relative flex items-center gap-2.5 p-3 rounded-2xl shadow-2xl cursor-pointer border transition-all ${
          isWithin10Km
            ? 'bg-red-600 hover:bg-red-700 text-white border-red-400/80 shadow-red-900/30'
            : 'bg-slate-900 hover:bg-slate-800 text-white border-amber-500/60 shadow-black/40'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Pulsing radar icon */}
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-white opacity-20"></span>
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>

        {/* Text preview */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider">
              {activeVictims.length > 1
                ? `🚨 ${activeVictims.length} Danger Alerts`
                : isWithin10Km
                ? 'Danger Alert (10km)'
                : 'Active Danger'}
            </span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono font-bold">
              {target.distKm.toFixed(1)} km
            </span>
          </div>
          <div className="text-xs truncate font-medium opacity-90 mt-0.5">
            {activeVictims.length > 1 ? `#${safeIndex + 1}: ` : ''}
            {target.category}: {target.description}
          </div>
        </div>

        {/* Cycle buttons if multiple victims */}
        {activeVictims.length > 1 && (
          <div className="flex items-center gap-0.5 mr-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handlePrevVictim}
              className="p-1 hover:bg-white/20 rounded text-white"
              title="Previous victim"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono font-bold px-0.5">
              {safeIndex + 1}/{activeVictims.length}
            </span>
            <button
              onClick={handleNextVictim}
              className="p-1 hover:bg-white/20 rounded text-white"
              title="Next victim"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Direction button directly visible on the bubble */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 flex items-center gap-1 bg-white text-slate-900 hover:bg-slate-100 font-bold text-[11px] py-1.5 px-2.5 rounded-lg shadow-sm transition-colors"
          title="Open directions directly in Google Maps"
        >
          <Navigation className="w-3 h-3 text-red-600" />
          <span>Directions</span>
        </a>

        {/* Close/dismiss icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setDismissed(true)
          }}
          className="p-1 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-colors"
          title="Dismiss alert bubble"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Full Action Modal (Click State: Multi-Victim Dispatch Board) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-red-600 px-4 py-3 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-sm tracking-wide">
                  RESPONDER ACTION DISPATCH ({activeVictims.length} VICTIMS ACTIVE)
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded hover:bg-red-700 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Subheader Notice */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>Turn-by-turn routes calculated from your live GPS location.</span>
              <span className="font-mono font-bold text-red-600">
                {victimsWithin10Km.length} within 10 km
              </span>
            </div>

            {/* Modal Body: Multi-Victim List */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-slate-800">
              {activeVictims.map((victim, idx) => {
                const vMapsUrl = getGoogleMapsDirectionsUrl(
                  victim.lat!,
                  victim.lng!,
                  refLat,
                  refLng
                )
                const vGeoUri = getNativeGeoUri(
                  victim.lat!,
                  victim.lng!,
                  `Emergency: ${victim.category}`
                )

                return (
                  <div
                    key={victim.id}
                    className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm hover:border-red-300 transition-colors space-y-2.5"
                  >
                    {/* DIRECTION BUTTON ON TOP OF EACH VICTIM MESSAGE */}
                    <div>
                      <a
                        href={vMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>
                          OPEN DIRECTIONS IN GOOGLE MAPS ({victim.distKm.toFixed(2)} KM)
                        </span>
                      </a>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                          Victim #{idx + 1}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                          {victim.category}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {victim.severity}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {getTimeAgo(victim.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-900 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {victim.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Distance from you
                        </span>
                        <span className="text-sm font-bold text-red-600 tabular-nums">
                          {victim.distKm.toFixed(2)} km
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Target GPS
                        </span>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums">
                          {victim.lat!.toFixed(4)}, {victim.lng!.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Secondary Navigation & Acknowledgement */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <a
                        href={vGeoUri}
                        className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-200 transition-colors"
                        title="Open in OsmAnd, Maps.me, or offline map app"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Offline (geo:)</span>
                      </a>

                      <button
                        onClick={() => handleAcknowledge(victim.id)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>I Am Responding</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
