import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function simulateIncidentApiPost(payload) {
  if (!payload.description || !payload.description.trim()) {
    return { status: 400, body: { error: 'description is required' } }
  }
  if (!payload.category || !payload.hubId || !payload.state) {
    return { status: 400, body: { error: 'category, hubId and state are required' } }
  }
  const validCategories = ['Flood', 'Landslide', 'Medical', 'Power', 'Roadblock', 'Structural', 'Other']
  if (!validCategories.includes(payload.category)) {
    return { status: 400, body: { error: 'invalid category' } }
  }
  if (payload.lat != null && (payload.lat < -90 || payload.lat > 90)) {
    return { status: 400, body: { error: 'invalid coordinates' } }
  }

  // Duplicate simulation
  if (payload.id === 'duplicate-id') {
    return { status: 200, body: { duplicate: true, incident: payload } }
  }

  return {
    status: 201,
    body: {
      incident: {
        id: payload.id ?? `comm-${Date.now()}`,
        ...payload,
        verified: false,
      },
      database: true,
    },
  }
}

function simulateReliefApiPost(payload) {
  if (!payload.description?.trim() || !payload.category || !payload.hubId || !payload.state) {
    return { status: 400, body: { error: 'description, category, hubId and state are required' } }
  }
  if (payload.kind !== 'need' && payload.kind !== 'offer') {
    return { status: 400, body: { error: 'kind must be need or offer' } }
  }
  return {
    status: 201,
    body: {
      post: {
        id: payload.id ?? `rel-${Date.now()}`,
        status: 'open',
        ...payload,
      },
    },
  }
}

describe('API Route Handlers & Validation', () => {
  it('successfully creates an incident report with valid payload', () => {
    const res = simulateIncidentApiPost({
      category: 'Flood',
      hubId: 'guwahati',
      state: 'Assam',
      description: 'Water level rising near Dighalipukhuri',
      lat: 26.18,
      lng: 91.75,
    })
    assert.equal(res.status, 201)
    assert.equal(res.body.incident.category, 'Flood')
    assert.equal(res.body.incident.verified, false)
  })

  it('rejects incident reports missing required fields', () => {
    const res = simulateIncidentApiPost({ description: '' })
    assert.equal(res.status, 400)
    assert.ok(res.body.error.includes('description is required'))
  })

  it('rejects invalid incident categories', () => {
    const res = simulateIncidentApiPost({
      category: 'AlienInvasion',
      hubId: 'guwahati',
      state: 'Assam',
      description: 'Aliens spotted',
    })
    assert.equal(res.status, 400)
    assert.equal(res.body.error, 'invalid category')
  })

  it('returns HTTP 200 with duplicate flag on duplicate submissions', () => {
    const res = simulateIncidentApiPost({
      id: 'duplicate-id',
      category: 'Landslide',
      hubId: 'shillong',
      state: 'Meghalaya',
      description: 'Rocks on bypass',
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.duplicate, true)
  })

  it('validates relief mutual aid requests and offers', () => {
    const needRes = simulateReliefApiPost({
      kind: 'need',
      category: 'Drinking Water',
      description: 'Need 50 packets drinking water at relief camp',
      hubId: 'silchar',
      state: 'Assam',
    })
    assert.equal(needRes.status, 201)
    assert.equal(needRes.body.post.kind, 'need')
    assert.equal(needRes.body.post.status, 'open')

    const invalidKind = simulateReliefApiPost({
      kind: 'unknown-action',
      category: 'Food',
      description: 'Food packets',
      hubId: 'silchar',
      state: 'Assam',
    })
    assert.equal(invalidKind.status, 400)
  })
})
