'use client'

import { useMemo, useState, useEffect } from 'react'
import { X, HeartHandshake, Package, CheckCircle, Clock, MapPin, Phone, Loader2 } from 'lucide-react'
import type { Hub, ReliefKind, ReliefPost } from '@/types'
import { NE_HUBS } from '@/data/neData'
import { submitRelief, updateReliefPost } from '@/lib/community'

interface ReliefBoardProps {
  open: boolean
  onClose: () => void
  initialMode: ReliefKind
  currentHub: Hub
  posts: ReliefPost[]
  onChanged: () => void | Promise<void>
}

const NEED_CATEGORIES = ['Rescue', 'Medical', 'Drinking Water', 'Food', 'Shelter', 'Missing Person', 'Other']
const OFFER_CATEGORIES = ['Volunteer', 'Transport', 'Food', 'Shelter', 'Medical', 'Other']

const STATUS_STYLE: Record<ReliefPost['status'], string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-200',
  claimed: 'bg-amber-50 text-amber-700 border-amber-200',
  fulfilled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function ReliefBoard({ open, onClose, initialMode, currentHub, posts, onChanged }: ReliefBoardProps) {
  const [mode, setMode] = useState<ReliefKind>(initialMode)
  const [category, setCategory] = useState(initialMode === 'need' ? 'Rescue' : 'Volunteer')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [hubId, setHubId] = useState(currentHub.id)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ synced: boolean } | null>(null)
  const [scope, setScope] = useState<'hub' | 'all'>('hub')

  const categories = mode === 'need' ? NEED_CATEGORIES : OFFER_CATEGORIES
  const selectedHub = NE_HUBS.find(h => h.id === hubId) ?? currentHub

  // Keep the modal in sync when it is reopened in a different mode.
  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setCategory(initialMode === 'need' ? 'Rescue' : 'Volunteer')
    setResult(null)
  }, [open, initialMode])

  const visible = useMemo(() => {
    const scoped = scope === 'hub' ? posts.filter(p => p.hubId === hubId) : posts
    return scoped
      .slice()
      .sort((a, b) => {
        const order = { open: 0, claimed: 1, fulfilled: 2 }
        return order[a.status] - order[b.status] || +new Date(b.createdAt) - +new Date(a.createdAt)
      })
  }, [posts, scope, hubId])

  const openNeeds = posts.filter(p => p.kind === 'need' && p.status === 'open').length

  if (!open) return null

  const switchMode = (next: ReliefKind) => {
    setMode(next)
    setCategory(next === 'need' ? 'Rescue' : 'Volunteer')
    setResult(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!description.trim()) return
    setBusy(true)
    const { synced } = await submitRelief({
      kind: mode,
      category,
      description: description.trim(),
      name: name.trim() || 'Anonymous',
      contact: contact.trim(),
      hubId,
      state: selectedHub.state,
    })
    setBusy(false)
    setResult({ synced })
    setDescription('')
    await onChanged()
  }

  const handleStatus = async (post: ReliefPost, status: ReliefPost['status']) => {
    await updateReliefPost(post.id, { status, claimedBy: status === 'claimed' ? 'Community volunteer' : post.claimedBy })
    await onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-rose-600" />
            <span className="font-bold text-slate-900 text-sm">Relief Board</span>
            <span className="text-xs text-slate-400 hidden sm:inline">needs and offers across NE India</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => switchMode('need')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 border-b-2 transition-colors ${mode === 'need' ? 'border-rose-600 text-rose-600 bg-rose-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <HeartHandshake className="w-3.5 h-3.5" /> Need help
          </button>
          <button
            onClick={() => switchMode('offer')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 border-b-2 transition-colors ${mode === 'offer' ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Package className="w-3.5 h-3.5" /> Offer help
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {result && (
            <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${result.synced ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${result.synced ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className="text-xs">
                <p className={`font-semibold ${result.synced ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {result.synced ? 'Posted to the board' : 'Saved offline — will sync automatically'}
                </p>
                <p className={result.synced ? 'text-emerald-700' : 'text-amber-700'}>
                  {mode === 'need' ? 'Volunteers nearby can now see your request.' : 'People who need help can now contact you.'}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Area</label>
                <select
                  value={hubId}
                  onChange={e => setHubId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {NE_HUBS.map(h => <option key={h.id} value={h.id}>{h.name}, {h.state}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                {mode === 'need' ? 'What do you need?' : 'What can you offer?'}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                required
                maxLength={400}
                placeholder={mode === 'need'
                  ? 'e.g. 4 people stranded on the roof, no drinking water since morning'
                  : 'e.g. I have a boat and can help with evacuation near Barpeta'}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
                placeholder="Your name (optional)"
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                type="tel"
                maxLength={40}
                placeholder="Phone / WhatsApp"
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !description.trim()}
              className={`w-full flex items-center justify-center gap-1.5 text-white font-semibold text-xs rounded-lg px-4 py-2.5 transition-colors disabled:bg-slate-300 ${mode === 'need' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'need' ? 'Post request' : 'Post offer'}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              No account needed. Do not post exact addresses of vulnerable people.
            </p>
          </form>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {mode === 'need' ? 'Open requests' : 'Available help'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">{visible.filter(p => p.status === 'open').length} open</span>
              </div>
              <div className="flex border border-slate-200 rounded overflow-hidden">
                <button onClick={() => setScope('hub')} className={`text-[10px] px-2 py-1 font-semibold ${scope === 'hub' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>This area</button>
                <button onClick={() => setScope('all')} className={`text-[10px] px-2 py-1 font-semibold ${scope === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>All NE</button>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 font-medium">No posts here yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Be the first — {openNeeds} open requests across NE India.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visible.map(post => (
                  <div key={post.id} className="border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{post.category}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_STYLE[post.status]}`}>{post.status}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {post.hubId}
                      </span>
                      <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(post.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-snug">{post.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500">{post.name}</span>
                      {post.contact && (
                        <a href={`tel:${post.contact}`} className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" /> {post.contact}
                        </a>
                      )}
                      <span className="flex-1" />
                      {post.kind === 'need' && post.status === 'open' && (
                        <button
                          onClick={() => handleStatus(post, 'claimed')}
                          className="text-[10px] font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-1"
                        >
                          I can help
                        </button>
                      )}
                      {post.status === 'claimed' && (
                        <button
                          onClick={() => handleStatus(post, 'fulfilled')}
                          className="text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-1"
                        >
                          Mark fulfilled
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
