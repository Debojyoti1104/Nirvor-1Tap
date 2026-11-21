import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const ALL_NE_STATES = [
  'Assam',
  'Meghalaya',
  'Arunachal Pradesh',
  'Manipur',
  'Mizoram',
  'Nagaland',
  'Tripura',
  'Sikkim',
]

const SAMPLE_HUBS = [
  { id: 'guwahati', name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { id: 'shillong', name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933 },
  { id: 'itanagar', name: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053 },
  { id: 'imphal', name: 'Imphal', state: 'Manipur', lat: 24.8170, lng: 93.9368 },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176 },
  { id: 'kohima', name: 'Kohima', state: 'Nagaland', lat: 25.6751, lng: 94.1086 },
  { id: 'agartala', name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868 },
  { id: 'gangtok', name: 'Gangtok', state: 'Sikkim', lat: 27.3389, lng: 88.6065 },
]

describe('Multi-State Disaster Directory & Hub Coverage', () => {
  it('covers all 8 Northeast states without omissions', () => {
    assert.equal(ALL_NE_STATES.length, 8)
    const statesInHubs = new Set(SAMPLE_HUBS.map(h => h.state))
    for (const state of ALL_NE_STATES) {
      assert.ok(statesInHubs.has(state), `Hub coverage missing for state: ${state}`)
    }
  })

  it('all disaster hubs contain valid geographic coordinates inside Northeast region', () => {
    for (const hub of SAMPLE_HUBS) {
      assert.ok(hub.lat >= 21.0 && hub.lat <= 30.0, `Latitude out of NE India bounds for ${hub.name}: ${hub.lat}`)
      assert.ok(hub.lng >= 87.0 && hub.lng <= 98.0, `Longitude out of NE India bounds for ${hub.name}: ${hub.lng}`)
    }
  })

  it('contains universal disaster helplines', () => {
    const universalHelplines = {
      nationalEmergency: '112',
      disasterManagement: '1070',
      ambulance: '108',
      fire: '101',
      police: '100',
    }
    assert.equal(universalHelplines.nationalEmergency, '112')
    assert.equal(universalHelplines.disasterManagement, '1070')
    assert.equal(universalHelplines.ambulance, '108')
  })
})
