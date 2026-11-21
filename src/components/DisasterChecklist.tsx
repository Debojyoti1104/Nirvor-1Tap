'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Shield, Zap } from 'lucide-react'
import type { ChecklistType } from '@/types'
import { NE_CHECKLISTS } from '@/data/neData'

const TYPE_LABELS: Record<ChecklistType, string> = {
  flood: 'Flood', landslide: 'Landslide', earthquake: 'Earthquake',
}

const TYPE_COLORS: Record<ChecklistType, string> = {
  flood: 'text-blue-700 bg-blue-50 border-blue-200',
  landslide: 'text-amber-700 bg-amber-50 border-amber-200',
  earthquake: 'text-red-700 bg-red-50 border-red-200',
}

export default function DisasterChecklist() {
  const [activeType, setActiveType] = useState<ChecklistType>('flood')
  const [completions, setCompletions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try { setCompletions(JSON.parse(localStorage.getItem('nc_checklist') ?? '{}')) }
    catch { /* ignore */ }
  }, [])

  const saveCompletions = (updated: Record<string, boolean>) => {
    setCompletions(updated)
    try { localStorage.setItem('nc_checklist', JSON.stringify(updated)) } catch { /* ignore */ }
  }

  const checklist = NE_CHECKLISTS.find(c => c.type === activeType)!
  const completedCount = checklist.items.filter(i => completions[i.id]).length
  const progress = Math.round((completedCount / checklist.items.length) * 100)
  const criticalUnchecked = checklist.items.filter(i => i.critical && !completions[i.id]).length

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(Object.keys(TYPE_LABELS) as ChecklistType[]).map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            className={`flex-1 text-sm font-semibold py-2 px-3 rounded-lg border transition-colors ${activeType === type ? TYPE_COLORS[type] : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">{checklist.title}</span>
          <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">{completedCount}/{checklist.items.length}</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#059669' : progress > 60 ? '#D97706' : '#DC2626' }} />
        </div>
        {criticalUnchecked > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-red-500" />
            <span className="text-xs text-red-600 font-medium">{criticalUnchecked} critical item{criticalUnchecked !== 1 ? 's' : ''} remaining</span>
          </div>
        )}
        {progress === 100 && (
          <div className="flex items-center gap-1 mt-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">All items completed</span>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        {checklist.items.map(item => {
          const done = !!completions[item.id]
          return (
            <button key={item.id} onClick={() => saveCompletions({ ...completions, [item.id]: !done })}
              className={`w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-lg border transition-all ${done ? 'bg-emerald-50 border-emerald-200' : item.critical ? 'bg-red-50 border-red-100 hover:border-red-200' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
              {done ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
              <span className={`text-sm leading-snug ${done ? 'text-emerald-800 line-through' : item.critical ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>{item.text}</span>
              {item.critical && !done && <span className="ml-auto text-xs text-red-500 font-semibold flex-shrink-0 mt-0.5">CRITICAL</span>}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => { const reset: Record<string,boolean> = {}; checklist.items.forEach(i => { reset[i.id] = false }); saveCompletions({ ...completions, ...reset }) }}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline">
        Reset {TYPE_LABELS[activeType]} checklist
      </button>
    </div>
  )
}
