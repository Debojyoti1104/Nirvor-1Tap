'use client'

/**
 * community.ts — client-side sync helpers.
 *
 * Every write is optimistic: try the API, and if the network is down, queue it
 * in localStorage and flush automatically when the browser comes back online.
 */

import type { Incident, IncidentSeverity, ReliefPost, ReliefStatus } from '@/types'

const OUTBOX_KEY = 'nc_outbox_v1'
const CACHE_INCIDENTS = 'nc_cache_incidents_v1'
const CACHE_RELIEF = 'nc_cache_relief_v1'
export const SYNC_EVENT = 'nc:synced'

export type OutboxKind = 'incident' | 'relief' | 'incident-verify' | 'relief-update'

export interface OutboxEntry {
  id: string
  kind: OutboxKind
  body: Record<string, unknown>
  createdAt: string
  retries?: number
}

// ─── Outbox ────────────────────────────────────────────────────────────────
export function readOutbox(): OutboxEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const v1 = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as OutboxEntry[]
    const legacy = JSON.parse(localStorage.getItem('nc_outbox') ?? '[]') as OutboxEntry[]
    if (Array.isArray(legacy) && legacy.length > 0) {
      localStorage.removeItem('nc_outbox')
      const merged = [...v1, ...legacy]
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(merged))
      return merged
    }
    return Array.isArray(v1) ? v1 : []
  } catch {
    return []
  }
}

export function clearOutbox() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(OUTBOX_KEY)
    localStorage.removeItem('nc_outbox')
  } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { pending: 0 } }))
}

function writeOutbox(entries: OutboxEntry[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries))
  } catch { /* storage full / blocked */ }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { pending: entries.length } }))
}

export function enqueue(kind: OutboxKind, body: Record<string, unknown>) {
  const entries = readOutbox()
  // Avoid duplicate optimistic entries for the same record.
  const key = body.id ?? body.postId
  if (key && entries.some(e => e.kind === kind && (e.body.id === key || e.body.postId === key))) return
  entries.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, body, createdAt: new Date().toISOString() })
  writeOutbox(entries)
}

export function pendingCount(): number {
  return readOutbox().length
}

async function send(entry: OutboxEntry): Promise<boolean> {
  const url = entry.kind.startsWith('incident') ? '/api/incidents' : '/api/relief'
  const method = entry.kind === 'incident' || entry.kind === 'relief' ? 'POST' : 'PATCH'
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry.body),
    })
    // 200/201 = success, 409 = already delivered to database
    if (res.ok || res.status === 409) return true

    // If client error (400-499, except 429 rate limit), payload is invalid/handled,
    // so consider it done to prevent infinite outbox retry loops.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return true
    }

    // Check if JSON response reports it is already delivered/duplicate
    const data = await res.json().catch(() => null)
    if (data?.duplicate || data?.error?.includes('duplicate') || data?.error?.includes('already exists')) {
      return true
    }
    return false
  } catch {
    return false
  }
}

let isFlushing = false

export async function flushOutbox(): Promise<number> {
  if (isFlushing) return pendingCount()
  isFlushing = true
  try {
    const entries = readOutbox()
    if (entries.length === 0) return 0
    const remaining: OutboxEntry[] = []
    for (const entry of entries) {
      try {
        const ok = await send(entry)
        if (!ok) {
          const retries = (entry.retries ?? 0) + 1
          if (retries < 4) {
            remaining.push({ ...entry, retries })
          } else {
            console.warn('[community] Dropping stalled outbox item after 4 retries:', entry.id)
          }
        }
      } catch {
        remaining.push(entry)
      }
    }
    writeOutbox(remaining)
    return remaining.length
  } finally {
    isFlushing = false
  }
}

// ─── Reads (cached for offline) ────────────────────────────────────────────
function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

export async function fetchIncidents(): Promise<{ incidents: Incident[]; live: boolean; database: boolean }> {
  try {
    const res = await fetch('/api/incidents', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { incidents?: Incident[]; database?: boolean }
    const incidents = data.incidents ?? []
    writeCache(CACHE_INCIDENTS, incidents)
    return { incidents, live: true, database: data.database === true }
  } catch {
    return { incidents: readCache<Incident[]>(CACHE_INCIDENTS) ?? [], live: false, database: false }
  }
}

export async function fetchRelief(): Promise<{ posts: ReliefPost[]; live: boolean }> {
  try {
    const res = await fetch('/api/relief', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { posts?: ReliefPost[] }
    const posts = data.posts ?? []
    writeCache(CACHE_RELIEF, posts)
    return { posts, live: true }
  } catch {
    return { posts: readCache<ReliefPost[]>(CACHE_RELIEF) ?? [], live: false }
  }
}

// ─── Writes ────────────────────────────────────────────────────────────────
export interface NewIncidentInput {
  category: Incident['category']
  severity: IncidentSeverity
  hubId: string
  state: Incident['state']
  description: string
  lat?: number
  lng?: number
}

export async function submitIncident(input: NewIncidentInput): Promise<{ synced: boolean; incident: Incident }> {
  const incident: Incident = {
    id: `community-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    timestamp: new Date().toISOString(),
    verified: false,
    reporterType: 'community',
  }

  // 1. Immediate optimistic local cache write so offline reads have it instantly
  try {
    const cached = readCache<Incident[]>(CACHE_INCIDENTS) ?? []
    writeCache(CACHE_INCIDENTS, [incident, ...cached.filter((i) => i.id !== incident.id)])
  } catch {
    /* ignore */
  }

  // 2. Broadcast change to all local tabs immediately
  broadcastChange()

  // 3. Persist to API / Supabase
  try {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { incident?: Incident }
    const saved = data.incident ?? incident
    try {
      const cached = readCache<Incident[]>(CACHE_INCIDENTS) ?? []
      writeCache(CACHE_INCIDENTS, [saved, ...cached.filter((i) => i.id !== saved.id && i.id !== incident.id)])
    } catch {
      /* ignore */
    }
    broadcastChange()
    return { synced: true, incident: saved }
  } catch {
    enqueue('incident', incident as unknown as Record<string, unknown>)
    return { synced: false, incident }
  }
}

export async function setIncidentVerified(id: string, verified: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, verified }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return true
  } catch {
    enqueue('incident-verify', { id, verified })
    return false
  }
}

export interface NewReliefInput {
  kind: ReliefPost['kind']
  category: string
  description: string
  name: string
  contact: string
  hubId: string
  state: ReliefPost['state']
}

export async function submitRelief(input: NewReliefInput): Promise<{ synced: boolean; post: ReliefPost }> {
  const post: ReliefPost = {
    id: `relief-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  // 1. Immediate optimistic local cache write so offline reads have it instantly
  try {
    const cached = readCache<ReliefPost[]>(CACHE_RELIEF) ?? []
    writeCache(CACHE_RELIEF, [post, ...cached.filter((p) => p.id !== post.id)])
  } catch {
    /* ignore */
  }

  // 2. Broadcast change to all local tabs immediately
  broadcastChange()

  try {
    const res = await fetch('/api/relief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { post?: ReliefPost }
    const saved = data.post ?? post
    try {
      const cached = readCache<ReliefPost[]>(CACHE_RELIEF) ?? []
      writeCache(CACHE_RELIEF, [saved, ...cached.filter((p) => p.id !== saved.id && p.id !== post.id)])
    } catch {
      /* ignore */
    }
    broadcastChange()
    return { synced: true, post: saved }
  } catch {
    enqueue('relief', post as unknown as Record<string, unknown>)
    return { synced: false, post }
  }
}

export async function updateReliefPost(
  id: string,
  patch: { status?: ReliefStatus; claimedBy?: string }
): Promise<boolean> {
  try {
    const res = await fetch('/api/relief', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return true
  } catch {
    enqueue('relief-update', { id, ...patch })
    return false
  }
}

/** Notify other tabs/devices listening on the same origin. */
export function broadcastChange() {
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('nc_community')
      channel.postMessage('changed')
      channel.close()
    }
  } catch { /* ignore */ }
}
