'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { Hub, Facility, Incident } from '@/types'

interface EmergencyMapProps {
  hub: Hub
  facilities: Facility[]
  incidents: Incident[]
  lowBandwidth?: boolean
}

type FilterType = 'all' | 'shelter' | 'hospital' | 'incident'
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
  shelter: 'Shelters',
  hospital: 'Hospitals',
  incident: 'Incidents',
}

const INCIDENT_COLORS: Record<string, string> = {
  Flood: '#3B82F6',
  Landslide: '#D97706',
  Roadblock: '#F97316',
  'Power Outage': '#EAB308',
  Earthquake: '#DC2626',
  'Medical Emergency': '#EC4899',
}

export default function EmergencyMap({ hub, facilities, incidents, lowBandwidth = false }: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('street')
  const [mapLoaded, setMapLoaded] = useState(false)

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

      const map = L.map(mapRef.current, { center: [hub.lat, hub.lng], zoom: 12 })
      const layer = BASE_LAYERS[baseLayer]
      L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: layer.maxZoom,
      }).addTo(map)
      mapInstanceRef.current = map

      const createIcon = (color: string, symbol: string, size = 28) =>
        L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25)"><span style="transform:rotate(45deg);font-size:${Math.round(size * 0.45)}px;line-height:1">${symbol}</span></div>`,
          className: '', iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size],
        })

      if (activeFilter === 'all' || activeFilter === 'shelter') {
        facilities.filter(f => f.type === 'shelter').forEach(f => {
          const occ = f.currentOccupancy != null && f.capacity != null
            ? `<div style="margin-top:4px;font-size:11px;color:#475569">Occupancy: ${f.currentOccupancy}/${f.capacity}</div>` : ''
          L.marker([f.lat, f.lng], { icon: createIcon('#059669', 'S') })
            .bindPopup(`<div style="font-family:sans-serif;min-width:190px"><div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:4px">${f.name}</div><div style="font-size:11px;color:#475569">${f.address}</div>${occ}<div style="margin-top:8px;display:flex;gap:6px">${f.phone ? `<a href="tel:${f.phone}" style="background:#059669;color:white;padding:3px 8px;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600">Call</a>` : ''}<a href="https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}" target="_blank" style="background:#0F172A;color:white;padding:3px 8px;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600">Directions</a></div></div>`)
            .addTo(map)
        })
      }

      if (activeFilter === 'all' || activeFilter === 'hospital') {
        facilities.filter(f => f.type === 'hospital' || f.type === 'police').forEach(f => {
          const color = f.type === 'hospital' ? '#DC2626' : '#0F172A'
          const sym = f.type === 'hospital' ? 'H' : 'P'
          L.marker([f.lat, f.lng], { icon: createIcon(color, sym) })
            .bindPopup(`<div style="font-family:sans-serif;min-width:190px"><div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:4px">${f.name}</div><div style="font-size:11px;color:#475569">${f.address}</div><div style="margin-top:8px;display:flex;gap:6px">${f.phone ? `<a href="tel:${f.phone}" style="background:#DC2626;color:white;padding:3px 8px;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600">Call</a>` : ''}<a href="https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}" target="_blank" style="background:#0F172A;color:white;padding:3px 8px;border-radius:4px;font-size:11px;text-decoration:none;font-weight:600">Directions</a></div></div>`)
            .addTo(map)
        })
      }

      if (activeFilter === 'all' || activeFilter === 'incident') {
        incidents.forEach(inc => {
          if (!inc.lat || !inc.lng) return
          const color = INCIDENT_COLORS[inc.category] ?? '#6B7280'
          L.marker([inc.lat, inc.lng], { icon: createIcon(color, '!', 24) })
            .bindPopup(`<div style="font-family:sans-serif;min-width:190px"><div style="margin-bottom:6px"><span style="background:${color};color:white;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700">${inc.category}</span> <span style="background:#F1F5F9;color:#475569;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600">${inc.severity}</span></div><div style="font-size:12px;color:#0F172A;line-height:1.4">${inc.description}</div><div style="font-size:10px;color:#94A3B8;margin-top:4px">${new Date(inc.timestamp).toLocaleString('en-IN')}</div>${inc.verified ? '<div style="font-size:10px;color:#059669;margin-top:2px;font-weight:600">Verified</div>' : '<div style="font-size:10px;color:#D97706;margin-top:2px">Community Report</div>'}</div>`)
            .addTo(map)
        })
      }

      L.circleMarker([hub.lat, hub.lng], { radius: 6, fillColor: '#0F172A', color: 'white', weight: 2, fillOpacity: 1 })
        .addTo(map).bindTooltip(hub.name, { permanent: false })

      setMapLoaded(true)
    }

    initMap().catch(console.error)
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub.id, lowBandwidth, activeFilter, baseLayer, facilities.length, incidents.length])

  if (lowBandwidth) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
        <div className="text-slate-500 text-sm font-medium mb-1">Map hidden in Low-Bandwidth Mode</div>
        <div className="text-slate-400 text-xs">Enable full mode to see the interactive map</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
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
            onClick={() => setActiveFilter(f)}
            className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${activeFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        {!mapLoaded && <span className="ml-auto text-xs text-slate-400 animate-pulse">Loading map...</span>}
      </div>
      <div ref={mapRef} style={{ height: '420px', width: '100%' }} />
      <div className="flex items-center gap-4 px-3 py-2 border-t border-slate-100 bg-white flex-wrap">
        <span className="text-xs text-slate-400">Legend:</span>
        {[['#059669','Shelter'],['#DC2626','Hospital'],['#3B82F6','Flood'],['#D97706','Landslide'],['#F97316','Roadblock'],['#0F172A','Hub']].map(([color,label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
