/**
 * db.ts — server-only data access.
 *
 * Uses Supabase (REST) when configured, otherwise an in-memory store so the
 * app keeps working locally before keys are added. Never import this from a
 * client component.
 */

import type { Incident, ReliefPost, ReliefStatus } from '@/types'

type Row = Record<string, unknown>

const BASE = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
// New Supabase projects expose `sb_secret_...` keys, older ones `service_role` JWTs.
// Both bypass RLS and must stay server-side.
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  ''

export const hasDatabase = Boolean(BASE && KEY)

const HEADERS = {
  'Content-Type': 'application/json',
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
}

async function req(path: string, init?: RequestInit): Promise<unknown> {
  if (!hasDatabase) throw new Error('Supabase is not configured')
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...HEADERS, ...((init?.headers as Record<string, string> | undefined) ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Supabase ${res.status}: ${detail.slice(0, 240)}`)
  }
  if (res.status === 204) return null
  return res.json().catch(() => null)
}

// ─── In-memory fallback ────────────────────────────────────────────────────
const g = globalThis as unknown as {
  __ncMem?: { incidents: Incident[]; relief: ReliefPost[] }
}

function mem() {
  if (!g.__ncMem) g.__ncMem = { incidents: [], relief: [] }
  return g.__ncMem
}

// ─── Mapping ──────────────────────────────────────────────────────────────
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined)

function toIncident(r: Row): Incident {
  return {
    id: str(r.id),
    category: str(r.category) as Incident['category'],
    severity: str(r.severity) as Incident['severity'],
    hubId: str(r.hub_id),
    state: str(r.state) as Incident['state'],
    description: str(r.description),
    lat: num(r.lat),
    lng: num(r.lng),
    timestamp: str(r.created_at, new Date().toISOString()),
    verified: Boolean(r.verified),
    reporterType: str(r.reporter_type) === 'official' ? 'official' : 'community',
  }
}

function toRelief(r: Row): ReliefPost {
  return {
    id: str(r.id),
    kind: str(r.kind) === 'offer' ? 'offer' : 'need',
    category: str(r.category),
    description: str(r.description),
    name: str(r.name, 'Anonymous'),
    contact: str(r.contact),
    state: str(r.state) as ReliefPost['state'],
    hubId: str(r.hub_id),
    lat: num(r.lat),
    lng: num(r.lng),
    status: (str(r.status, 'open') as ReliefStatus),
    claimedBy: typeof r.claimed_by === 'string' ? r.claimed_by : undefined,
    createdAt: str(r.created_at, new Date().toISOString()),
  }
}

// ─── Incidents ─────────────────────────────────────────────────────────────
export async function listIncidents(): Promise<Incident[]> {
  if (!hasDatabase) {
    return [...mem().incidents].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
  }
  const rows = (await req('incidents?select=*&order=created_at.desc&limit=300')) as Row[] | null
  return (rows ?? []).map(toIncident)
}

export async function createIncident(incident: Incident): Promise<Incident> {
  if (!hasDatabase) {
    mem().incidents.unshift(incident)
    return incident
  }
  const rows = (await req('incidents?select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{
      id: incident.id,
      category: incident.category,
      severity: incident.severity,
      hub_id: incident.hubId,
      state: incident.state,
      description: incident.description,
      lat: incident.lat ?? null,
      lng: incident.lng ?? null,
      verified: incident.verified,
      reporter_type: incident.reporterType,
      created_at: incident.timestamp,
    }]),
  })) as Row[] | null
  return rows && rows[0] ? toIncident(rows[0]) : incident
}

export async function verifyIncident(id: string, verified: boolean): Promise<Incident | null> {
  if (!hasDatabase) {
    const found = mem().incidents.find(i => i.id === id)
    if (found) found.verified = verified
    return found ?? null
  }
  const rows = (await req(`incidents?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ verified }),
  })) as Row[] | null
  return rows && rows[0] ? toIncident(rows[0]) : null
}

// ─── Relief board ──────────────────────────────────────────────────────────
export async function listRelief(): Promise<ReliefPost[]> {
  if (!hasDatabase) {
    return [...mem().relief].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }
  const rows = (await req('relief_posts?select=*&order=created_at.desc&limit=300')) as Row[] | null
  return (rows ?? []).map(toRelief)
}

export async function createRelief(post: ReliefPost): Promise<ReliefPost> {
  if (!hasDatabase) {
    mem().relief.unshift(post)
    return post
  }
  const rows = (await req('relief_posts?select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{
      id: post.id,
      kind: post.kind,
      category: post.category,
      description: post.description,
      name: post.name,
      contact: post.contact,
      state: post.state,
      hub_id: post.hubId,
      lat: post.lat ?? null,
      lng: post.lng ?? null,
      status: post.status,
      claimed_by: post.claimedBy ?? null,
      created_at: post.createdAt,
    }]),
  })) as Row[] | null
  return rows && rows[0] ? toRelief(rows[0]) : post
}

export async function updateRelief(
  id: string,
  patch: { status?: ReliefStatus; claimedBy?: string }
): Promise<ReliefPost | null> {
  const body: Record<string, unknown> = {}
  if (patch.status) body.status = patch.status
  if (patch.claimedBy !== undefined) body.claimed_by = patch.claimedBy

  if (!hasDatabase) {
    const found = mem().relief.find(r => r.id === id)
    if (found) Object.assign(found, patch)
    return found ?? null
  }
  const rows = (await req(`relief_posts?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })) as Row[] | null
  return rows && rows[0] ? toRelief(rows[0]) : null
}
