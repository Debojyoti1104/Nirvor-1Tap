'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Navigation, X, CheckCircle2, Volume2, Compass } from 'lucide-react'
import type { Incident, Hub } from '@/types'
import { getDistanceKm, getGoogleMapsDirectionsUrl, getNativeGeoUri } from '@/lib/geoUtils'

interface ResponderNotificationAlertProps {
  responderLocation: { lat: number; lng: number } | null
  currentHub: Hub
  incidents: Incident[]
  responderMode: boolean
  onAcknowledge?: (incidentId: string) => void
}

/**
 * Standard Web Audio API emergency dispatch chime (100% offline, zero audio asset dependency)
 */
function playEmergencySiren() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Two-tone high-urgency emergency sequence (880 Hz -> 587 Hz -> 880 Hz)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'

    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(587.33, now + 0.15)
    osc.frequency.setValueAtTime(880, now + 0.3)
    osc.frequency.setValueAtTime(587.33, now + 0.45)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.65)
  } catch {
    /* browser autoplay policy or disabled audio */
  }
}

export default function ResponderNotificationAlert({
  responderLocation,
  currentHub,
  incidents,
  responderMode,
  onAcknowledge,
}: ResponderNotificationAlertProps) {
  const [activeAlert, setActiveAlert] = useState<Incident | null>(null)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const seenIncidentIdsRef = useRef<Set<string>>(new Set())

  const refLat = responderLocation?.lat ?? currentHub.lat
  const refLng = responderLocation?.lng ?? currentHub.lng

  // Monitor newly arriving emergency incidents within 10 km
  useEffect(() => {
    if (!responderMode) {
      setActiveAlert(null)
      return
    }

    // Filter incidents within 10 km that are Critical / Medical / SOS
    const emergencyCandidates = incidents.filter((inc) => {
      if (!inc.lat || !inc.lng || dismissedIds.includes(inc.id)) return false
      const isUrgent =
        inc.severity === 'Critical' ||
        inc.category === 'Medical Emergency' ||
        inc.description.includes('SOS') ||
        inc.description.includes('DANGER')
      if (!isUrgent) return false

      const distKm = getDistanceKm(refLat, refLng, inc.lat, inc.lng)
      return distKm <= 10
    })

    if (emergencyCandidates.length === 0) return

    // Find the latest emergency candidate
    const latest = emergencyCandidates[0]

    // Check if this is a newly arrived alert we haven't chimed for
    if (!seenIncidentIdsRef.current.has(latest.id)) {
      seenIncidentIdsRef.current.add(latest.id)
      setActiveAlert(latest)

      // 1. Play offline audio alert tone
      playEmergencySiren()

      // 2. Mobile vibration pulse
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 400])
        } catch {
          /* ignore */
        }
      }

      // 3. Native system push notification if enabled
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const distKm = getDistanceKm(refLat, refLng, latest.lat!, latest.lng!)
          new Notification('🚨 CRITICAL SOS: Victim In Danger (10km Radius)', {
            body: `${latest.category} — ${distKm.toFixed(1)} km away near ${latest.state}. Tap to view directions.`,
            icon: '/icon-192.png',
            tag: latest.id,
          })
        } catch {
          /* ignore */
        }
      }
    }
  }, [incidents, responderMode, refLat, refLng, dismissedIds])

  if (!responderMode || !activeAlert) return null

  const distKm = getDistanceKm(refLat, refLng, activeAlert.lat!, activeAlert.lng!)
  const mapsUrl = getGoogleMapsDirectionsUrl(activeAlert.lat!, activeAlert.lng!, refLat, refLng)
  const geoUri = getNativeGeoUri(activeAlert.lat!, activeAlert.lng!, `Emergency: ${activeAlert.category}`)

  const handleDismiss = () => {
    setDismissedIds((prev) => [...prev, activeAlert.id])
    setActiveAlert(null)
  }

  const handleRespond = () => {
    if (onAcknowledge) onAcknowledge(activeAlert.id)
    setDismissedIds((prev) => [...prev, activeAlert.id])
    setActiveAlert(null)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-2xl border-b-2 border-red-800 animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Urgency Pulse & Details */}
        <div className="flex items-start md:items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 flex-shrink-0 mt-0.5 md:mt-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-black/30 px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider">
                🚨 EMERGENCY SOS DISPATCH
              </span>
              <span className="bg-white text-red-700 px-2 py-0.5 rounded text-xs font-mono font-bold">
                {distKm.toFixed(1)} km from you
              </span>
              <span className="text-xs text-red-100 font-semibold">
                {activeAlert.category} ({activeAlert.severity})
              </span>
            </div>
            <p className="text-xs text-white/95 font-medium mt-1 line-clamp-1">
              {activeAlert.description}
            </p>
          </div>
        </div>

        {/* Right: Actions (Top Priority: Google Maps Directions) */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-extrabold px-3 py-2 rounded-lg shadow-md transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-red-600" />
            <span>DIRECTIONS IN GOOGLE MAPS</span>
          </a>

          <a
            href={geoUri}
            className="flex items-center justify-center gap-1 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-2.5 py-2 rounded-lg border border-red-500/60 transition-colors"
            title="Open offline geo: URI"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </a>

          <button
            onClick={handleRespond}
            className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Responding</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-red-700 rounded-lg text-white/80 hover:text-white transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
