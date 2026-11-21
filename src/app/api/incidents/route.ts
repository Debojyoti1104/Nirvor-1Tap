import { NextResponse } from 'next/server'
import { createIncident, hasDatabase, listIncidents, verifyIncident } from '@/lib/db'
import type { Incident } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const incidents = await listIncidents()
    return NextResponse.json({ incidents, database: hasDatabase })
  } catch (error) {
    console.error('[api/incidents] GET', error)
    return NextResponse.json({ incidents: [], database: false, degraded: true })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Incident>
    if (!body.description || !body.description.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }
    if (!body.category || !body.hubId || !body.state) {
      return NextResponse.json({ error: 'category, hubId and state are required' }, { status: 400 })
    }

    const incident: Incident = {
      id: body.id ?? `community-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: body.category,
      severity: body.severity ?? 'Moderate',
      hubId: body.hubId,
      state: body.state,
      description: body.description.trim().slice(0, 800),
      lat: body.lat,
      lng: body.lng,
      timestamp: body.timestamp ?? new Date().toISOString(),
      verified: false,
      reporterType: 'community',
    }

    const saved = await createIncident(incident)
    return NextResponse.json({ incident: saved, database: hasDatabase }, { status: 201 })
  } catch (error) {
    console.error('[api/incidents] POST', error)
    return NextResponse.json({ error: 'Could not save report' }, { status: 503 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; verified?: boolean }
    if (!body.id || typeof body.verified !== 'boolean') {
      return NextResponse.json({ error: 'id and verified are required' }, { status: 400 })
    }
    const incident = await verifyIncident(body.id, body.verified)
    if (!incident) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ incident })
  } catch (error) {
    console.error('[api/incidents] PATCH', error)
    return NextResponse.json({ error: 'Could not update report' }, { status: 503 })
  }
}
