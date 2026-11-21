'use client'

import { CloudRain, Users, Home, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import type { RiskAssessment, WeatherData } from '@/types'

interface TelemetryStripProps {
  risk: RiskAssessment
  weather: WeatherData
  communityReports: number
  verifiedShelters: number
}

export default function TelemetryStrip({ risk, weather, communityReports, verifiedShelters }: TelemetryStripProps) {
  const riskColor = risk.level === 'CRITICAL' ? '#DC2626' : risk.level === 'HIGH' || risk.level === 'MODERATE' ? '#D97706' : '#059669'
  const riskBg = risk.level === 'CRITICAL' ? 'bg-red-50 border-red-200' : risk.level === 'HIGH' || risk.level === 'MODERATE' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {/* Risk Index */}
      <div className={`rounded-lg border p-3 ${riskBg}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: riskColor }} />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Index</span>
          </div>
          {weather.source === 'live' ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: riskColor }}>{risk.score}</span>
          <span className="text-xs font-medium" style={{ color: riskColor }}>/100</span>
        </div>
        <div className="text-xs font-bold tracking-wider mt-0.5" style={{ color: riskColor }}>{risk.level}</div>
        <div className="h-1 bg-white/60 rounded-full overflow-hidden mt-1.5">
          <div className="h-full rounded-full" style={{ width: `${risk.score}%`, backgroundColor: riskColor }} />
        </div>
      </div>

      {/* Precipitation */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <CloudRain className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Precipitation</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{weather.precipitation24h.toFixed(1)}</span>
          <span className="text-xs text-slate-400 font-mono">mm/24h</span>
        </div>
        <div className="font-mono text-xs text-slate-400 mt-0.5 tabular-nums">Now: {weather.rainfall.toFixed(1)} mm/hr</div>
        <div className="font-mono text-xs text-slate-400 tabular-nums">Wind: {weather.windSpeed.toFixed(0)} km/h</div>
      </div>

      {/* Community Reports */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reports</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{communityReports}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">Active incidents</div>
        <div className="text-xs text-slate-400">This hub area</div>
      </div>

      {/* Shelters */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Home className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shelters</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">{verifiedShelters}</span>
        </div>
        <div className="text-xs text-emerald-600 font-medium mt-0.5">Verified Nearby</div>
        <div className="text-xs text-slate-400">Relief camps active</div>
      </div>
    </div>
  )
}
