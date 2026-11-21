import { NextResponse } from 'next/server'
import { createRelief, hasDatabase, listRelief, updateRelief } from '@/lib/db'
import type { ReliefPost, ReliefStatus } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const posts = await listRelief()
    return NextResponse.json({ posts, database: hasDatabase })
  } catch (error) {
    console.error('[api/relief] GET', error)
    return NextResponse.json({ posts: [], database: false, degraded: true })
  }
}

export async function POST(request: Request) {
  let post: ReliefPost | null = null
  try {
    const body = (await request.json()) as Partial<ReliefPost>
    if (!body.description?.trim() || !body.category || !body.hubId || !body.state) {
      return NextResponse.json({ error: 'description, category, hubId and state are required' }, { status: 400 })
    }
    if (body.kind !== 'need' && body.kind !== 'offer') {
      return NextResponse.json({ error: 'kind must be need or offer' }, { status: 400 })
    }

    post = {
      id: body.id ?? `relief-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: body.kind,
      category: body.category,
      description: body.description.trim().slice(0, 800),
      name: (body.name || 'Anonymous').slice(0, 60),
      contact: (body.contact || '').slice(0, 80),
      state: body.state,
      hubId: body.hubId,
      lat: body.lat,
      lng: body.lng,
      status: 'open',
      createdAt: body.createdAt ?? new Date().toISOString(),
    }

    const saved = await createRelief(post)
    return NextResponse.json({ post: saved, database: hasDatabase }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('409') || msg.includes('duplicate key') || msg.includes('already exists')) {
      return NextResponse.json({ post, database: hasDatabase, duplicate: true }, { status: 200 })
    }
    console.error('[api/relief] POST', error)
    return NextResponse.json({ error: 'Could not save post' }, { status: 503 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; status?: ReliefStatus; claimedBy?: string }
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    if (body.status && !['open', 'claimed', 'fulfilled'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    const post = await updateRelief(body.id, { status: body.status, claimedBy: body.claimedBy })
    if (!post) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ post })
  } catch (error) {
    console.error('[api/relief] PATCH', error)
    return NextResponse.json({ error: 'Could not update post' }, { status: 503 })
  }
}
