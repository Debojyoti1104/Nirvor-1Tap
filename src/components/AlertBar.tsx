'use client'

import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { RiskAssessment, Hub } from '@/types'

interface AlertBarProps {
  risk: RiskAssessment
  hub: Hub
  dataSource: 'live' | 'fallback'
}

export default function AlertBar({ risk, hub, dataSource }: AlertBarProps) {
  const offline = dataSource === 'fallback' && (
    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-medium flex-shrink-0 ml-2">Offline</span>
  )

  if (risk.level === 'LOW') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-700 font-medium flex-1">{risk.advisoryText}</p>
        {dataSource === 'fallback' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium flex-shrink-0">Offline data</span>}
      </div>
    )
  }

  if (risk.level === 'MODERATE') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700 font-medium flex-1">{risk.advisoryText}</p>
        {dataSource === 'fallback' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium flex-shrink-0">Offline data</span>}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-b ${risk.level === 'CRITICAL' ? 'bg-red-600 border-red-700' : 'bg-amber-500 border-amber-600'}`}>
      <AlertTriangle className="w-3.5 h-3.5 text-white flex-shrink-0 animate-pulse" />
      <p className="text-xs text-white font-semibold flex-1">{risk.advisoryText}</p>
      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded font-bold flex-shrink-0">{hub.name}</span>
      {offline}
    </div>
  )
}
