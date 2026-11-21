'use client'

import { useState, useMemo } from 'react'
import { Phone, Search } from 'lucide-react'
import type { Helpline, NEState, HelplineCategory } from '@/types'
import { NE_HELPLINES, NE_STATES } from '@/data/neData'

const CAT_COLORS: Record<HelplineCategory, string> = {
  'National Emergency': 'bg-red-50 border-red-200 text-red-700',
  'State Disaster': 'bg-orange-50 border-orange-200 text-orange-700',
  'Medical': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Police': 'bg-slate-50 border-slate-200 text-slate-700',
  'Fire': 'bg-amber-50 border-amber-200 text-amber-700',
  'NDRF': 'bg-blue-50 border-blue-200 text-blue-700',
  'District Control': 'bg-purple-50 border-purple-200 text-purple-700',
}

const CATEGORIES: (HelplineCategory | 'All')[] = [
  'All', 'National Emergency', 'State Disaster', 'Medical', 'Police', 'Fire', 'NDRF', 'District Control',
]

export default function HelplineDirectory({ filterState }: { filterState?: NEState }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<HelplineCategory | 'All'>('All')
  const [stateFilter, setStateFilter] = useState<NEState | 'All'>(filterState ?? 'All')

  const filtered = useMemo(() => NE_HELPLINES.filter(h => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.number.includes(search)
    const matchCat = categoryFilter === 'All' || h.category === categoryFilter
    const matchState = stateFilter === 'All' || !h.state || h.state === stateFilter
    return matchSearch && matchCat && matchState
  }), [search, categoryFilter, stateFilter])

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search helplines..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value as NEState | 'All')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300">
          <option value="All">All States</option>
          {NE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(cat as HelplineCategory | 'All')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${categoryFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-400 font-medium">{filtered.length} helpline{filtered.length !== 1 ? 's' : ''} found</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map(h => (
          <div key={h.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2.5 hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${CAT_COLORS[h.category]}`}>{h.category}</span>
                {h.available24x7 && <span className="text-xs text-emerald-600 font-medium">24x7</span>}
              </div>
              <div className="font-medium text-sm text-slate-900 truncate">{h.name}</div>
              {h.state && <div className="text-xs text-slate-400">{h.state}</div>}
            </div>
            <a href={`tel:${h.number}`}
              className="flex items-center gap-1.5 ml-3 bg-slate-900 hover:bg-slate-700 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-lg tabular-nums transition-colors flex-shrink-0">
              <Phone className="w-3 h-3" />
              {h.number}
            </a>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No helplines match your search.</div>}
    </div>
  )
}
