'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { Hub, Facility, Incident } from '@/types'
import { getGoogleMapsDirectionsUrl, getNativeGeoUri } from '@/lib/geoUtils'

interface EmergencyMapProps {
  hub: Hub
  facilities: Facility[]
  incidents: Incident[]
  responderLocation?: { lat: number; lng: number } | null
  focusedIncidentId?: string | null
  lowBandwidth?: boolean
}

type FilterType = 'all' | 'hospital' | 'shelter' | 'police' | 'fire' | 'incident'
type BaseLayer = 'street' | 'terrain' | 'satellite'

const BASE_LAYERS: Record<BaseLayer, { label: string; url: string; attribution: string; maxZoom: number }> = {
  street: {
    label: 'Street',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  terrain: {
    label: 'Terrain',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
}

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All Layers',
  hospital: 'Hospitals & Clinics',
  shelter: 'Shelters',
  police: 'Police Stations',
  fire: 'Fire & Rescue',
  incident: 'Incidents',
}

const INCIDENT_COLORS: Record<string, string> = {
  Flood: '#2563EB',
  Landslide: '#D97706',
  Roadblock: '#EA580C',
  'Power Outage': '#CA8A04',
  Earthquake: '#DC2626',
  'Medical Emergency': '#DB2777',
}

const FACILITY_STYLES: Record<string, { color: string; sym: string; label: string }> = {
  hospital:  { color: '#DC2626', sym: '✚', label: 'Hospital' },
  clinic:    { color: '#F43F5E', sym: '✚', label: 'Clinic' },
  ambulance: { color: '#E11D48', sym: '🚑', label: 'Ambulance' },
  shelter:   { color: '#059669', sym: '⛺', label: 'Relief Shelter' },
  police:    { color: '#0F172A', sym: '★', label: 'Police' },
  fire:      { color: '#EA580C', sym: '▲', label: 'Fire & Rescue' },
}

export default function EmergencyMap({
  hub,
  facilities,
  incidents,
  responderLocation,
  focusedIncidentId,
  lowBandwidth = false,
}: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incidentMarkersRef = useRef<Map<string, any>>(new Map())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('street')
  const [mapLoaded, setMapLoaded] = useState(false)

  // ── Fly to & Open Popup on Focused Incident ──────────────────────────────
  useEffect(() => {
    if (!focusedIncidentId || !mapInstanceRef.current) return
    const marker = incidentMarkersRef.current.get(focusedIncidentId)
    const targetIncident = incidents.find((i) => i.id === focusedIncidentId)

    if (targetIncident?.lat && targetIncident?.lng) {
      const map = mapInstanceRef.current
      if (activeFilter !== 'all' && activeFilter !== 'incident') {
        setActiveFilter('all')
      }
      map.flyTo([targetIncident.lat, targetIncident.lng], 15, {
        animate: true,
        duration: 1.2,
      })
      setTimeout(() => {
        if (marker) {
          marker.openPopup()
        }
      }, 500)
    }
  }, [focusedIncidentId, incidents, activeFilter])

  useEffect(() => {
    if (lowBandwidth || !mapRef.current) return
    let mounted = true

    const initMap = async () => {
      const L = (await import('leaflet')).default
      if (!mounted || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      incidentMarkersRef.current.clear()

      // Default center: responder coordinates if available, else hub
      const centerLat = responderLocation?.lat ?? hub.lat
      const centerLng = responderLocation?.lng ?? hub.lng

      const map = L.map(mapRef.current, { center: [centerLat, centerLng], zoom: 12 })
      const layer = BASE_LAYERS[baseLayer]
      L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: layer.maxZoom,
      }).addTo(map)
      mapInstanceRef.current = map

      const createIcon = (color: string, symbol: string, size = 28) =>
        L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);font-size:${Math.round(size * 0.45)}px;line-height:1;color:white;font-weight:bold">${symbol}</span></div>`,
          className: '', iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size],
        })

      // ── Facilities Rendering ─────────────────────────────────────────────
      const shouldShowFacility = (type: string) => {
        if (activeFilter === 'all') return true
        if (activeFilter === 'hospital') return type === 'hospital' || type === 'clinic' || type === 'ambulance'
        if (activeFilter === 'shelter') return type === 'shelter'
        if (activeFilter === 'police') return type === 'police'
        if (activeFilter === 'fire') return type === 'fire'
        return false
      }

      facilities.filter(f => shouldShowFacility(f.type)).forEach(f => {
        const style = FACILITY_STYLES[f.type] || { color: '#475569', sym: '•', label: f.type }
        const occ = f.currentOccupancy != null && f.capacity != null
          ? `<div style="margin-top:4px;font-size:11px;color:#475569">Occupancy: ${f.currentOccupancy}/${f.capacity}</div>` : ''
        
        const facilityDirections = getGoogleMapsDirectionsUrl(
          f.lat,
          f.lng,
          responderLocation?.lat ?? hub.lat,
          responderLocation?.lng ?? hub.lng
        )

        L.marker([f.lat, f.lng], { icon: createIcon(style.color, style.sym) })
          .bindPopup(`<div style="font-family:sans-serif;min-width:210px">
            <div style="margin-bottom:6px">
              <a href="${facilityDirections}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:4px;background:#0F172A;color:white;padding:6px 10px;border-radius:6px;font-size:11px;text-decoration:none;font-weight:700">
                🧭 Open Directions in Google Maps
              </a>
            </div>
            <div style="display:inline-block;padding:2px 6px;border-radius:4px;background:${style.color};color:white;font-size:10px;font-weight:700;margin-bottom:4px">${style.label.toUpperCase()}</div>
            <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:2px">${f.name}</div>
            <div style="font-size:11px;color:#475569;margin-bottom:4px">${f.address || f.state}</div>
            ${occ}
            <div style="margin-top:8px;display:flex;gap:6px">
              ${f.phone ? `<a href="tel:${f.phone}" style="background:${style.color};color:white;padding:3px 8px;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600">Call</a>` : ''}
              <a href="geo:${f.lat},${f.lng}" style="background:#F1F5F9;color:#0F172A;padding:3px 8px;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600">Offline geo:</a>
            </div>
          </div>`)
          .addTo(map)
      })

      // ── Incidents Rendering (with 10km Danger Radius & Top Direction Button) ──
      if (activeFilter === 'all' || activeFilter === 'incident') {
        incidents.forEach(inc => {
          if (!inc.lat || !inc.lng) return
          const isDanger =
            inc.severity === 'Critical' ||
            inc.category === 'Medical Emergency' ||
            inc.description.includes('CRITICAL SOS') ||
            inc.description.includes('DANGER')

          const color = isDanger ? '#DC2626' : (INCIDENT_COLORS[inc.category] ?? '#6B7280')

          // 10km Danger Radius Circle for critical emergency broadcasts
          if (isDanger) {
            L.circle([inc.lat, inc.lng], {
              radius: 10000,
              color: '#DC2626',
              fillColor: '#EF4444',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '5, 5',
            })
              .addTo(map)
              .bindTooltip(`10 km Emergency Danger Zone (${inc.category})`, { permanent: false })
          }

          const dirUrl = getGoogleMapsDirectionsUrl(
            inc.lat,
            inc.lng,
            responderLocation?.lat ?? hub.lat,
            responderLocation?.lng ?? hub.lng
          )
          const geoUri = getNativeGeoUri(inc.lat, inc.lng, `Emergency: ${inc.category}`)

          // Top direction button inside the popup for responders
          const marker = L.marker([inc.lat, inc.lng], { icon: createIcon(color, isDanger ? '🚨' : '!', isDanger ? 32 : 24) })
            .bindPopup(`<div style="font-family:sans-serif;min-width:240px;padding:2px">
              <!-- DIRECTION BUTTON ON TOP OF MESSAGE -->
              <div style="margin-bottom:8px">
                <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:6px;background:#DC2626;color:#ffffff;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 1px 3px rgba(0,0,0,0.2)">
                  🧭 DIRECTIONS IN GOOGLE MAPS
                </a>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <span style="background:${color};color:white;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700">${inc.category}</span>
                <span style="background:#F1F5F9;color:#475569;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600">${inc.severity}</span>
              </div>
              <div style="font-size:12px;color:#0F172A;line-height:1.4;margin-bottom:6px">${inc.description}</div>
              <div style="font-size:10px;color:#94A3B8;margin-bottom:4px">${new Date(inc.timestamp).toLocaleString('en-IN')}</div>
              <div style="font-family:monospace;font-size:10px;color:#64748B;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #F1F5F9;padding-top:4px">
                <span>GPS: ${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}</span>
                <a href="${geoUri}" style="color:#2563EB;text-decoration:underline">offline (geo:)</a>
              </div>
            </div>`)
            .addTo(map)

          incidentMarkersRef.current.set(inc.id, marker)
        })
      }

      // ── Responder Location Marker ────────────────────────────────────────
      if (responderLocation && isFinite(responderLocation.lat) && isFinite(responderLocation.lng)) {
        L.circleMarker([responderLocation.lat, responderLocation.lng], {
          radius: 8,
          fillColor: '#2563EB',
          color: '#FFFFFF',
          weight: 3,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup('<b>You (Responder)</b><br>Live GPS Position')
      }

      // Hub Marker
      L.circleMarker([hub.lat, hub.lng], { radius: 7, fillColor: '#0F172A', color: 'white', weight: 2, fillOpacity: 1 })
        .addTo(map).bindTooltip(`Hub: ${hub.name}`, { permanent: false })

      setMapLoaded(true)
    }

    initMap().catch(console.error)
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hub.id,
    lowBandwidth,
    activeFilter,
    baseLayer,
    facilities.length,
    incidents.length,
    responderLocation?.lat,
    responderLocation?.lng,
  ])

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(filter)
    if (filter === 'incident' && mapInstanceRef.current) {
      const valid = incidents.filter(i => i.lat && i.lng)
      if (valid.length > 0) {
        const bounds = valid.map(i => [i.lat!, i.lng!] as [number, number])
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    }
  }

  if (lowBandwidth) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
        <div className="text-slate-500 text-sm font-medium mb-1">Map hidden in Low-Bandwidth Mode</div>
        <div className="text-slate-400 text-xs">Enable full mode to see the interactive map</div>
      </div>
    )
  }

  return (
    <div id="emergency-map-section" className="rounded-lg border border-slate-200 overflow-hidden bg-white scroll-mt-20">
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-white flex-wrap">
        <span className="text-xs text-slate-400 font-medium mr-1">Base:</span>
        {(Object.keys(BASE_LAYERS) as BaseLayer[]).map(layer => (
          <button
            key={layer}
            onClick={() => setBaseLayer(layer)}
            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${baseLayer === layer ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {BASE_LAYERS[layer].label}
          </button>
        ))}
        <span className="text-xs text-slate-300 mx-1">|</span>
        <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
        {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => handleFilterClick(f)}
            className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${activeFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        {!mapLoaded && <span className="ml-auto text-xs text-slate-400 animate-pulse">Loading map...</span>}
      </div>
      <div ref={mapRef} style={{ height: '440px', width: '100%' }} />
      <div className="flex items-center gap-4 px-3 py-2 border-t border-slate-100 bg-white flex-wrap">
        <span className="text-xs text-slate-400">Legend:</span>
        {[
          ['#DC2626', 'Hospital / Danger'],
          ['#F43F5E', 'Clinic'],
          ['#059669', 'Shelter'],
          ['#0F172A', 'Police / Hub'],
          ['#EA580C', 'Fire/Rescue'],
          ['#2563EB', 'Flood / You'],
          ['#D97706', 'Landslide'],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
