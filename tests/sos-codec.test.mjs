import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const PACKET_PREFIX = 'NE1'
const INCIDENT_TYPE_MAP = {
  Flood: 0x1,
  Landslide: 0x2,
  Medical: 0x3,
  Trapped: 0x4,
  Roadblock: 0x5,
}

const INCIDENT_CODE_MAP = {
  0x1: 'Flood',
  0x2: 'Landslide',
  0x3: 'Medical',
  0x4: 'Trapped',
  0x5: 'Roadblock',
}

const MEDICAL_FLAG = 0x8

function encodeSosPacket(input) {
  const incidentCode = INCIDENT_TYPE_MAP[input.incidentType]
  if (incidentCode === undefined) {
    throw new Error(`Unknown incident type: ${input.incidentType}`)
  }
  const countCode = input.peopleCountBucket ?? 1
  if (![1, 2, 3].includes(countCode)) {
    throw new Error(`Invalid peopleCountBucket: ${input.peopleCountBucket}`)
  }
  const medicalBit = input.medicalAidRequired ? MEDICAL_FLAG : 0x0
  const headerByte = (incidentCode << 4) | (medicalBit | countCode)
  const hexByte = headerByte.toString(16).toUpperCase().padStart(2, '0')

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error('Coordinates must be finite numbers')
  }
  const latStr = input.lat.toFixed(4)
  const lngStr = input.lng.toFixed(4)
  return `${PACKET_PREFIX}:${hexByte}:${latStr},${lngStr}`
}

function decodeSosPacket(raw) {
  const trimmed = raw.trim()
  const parts = trimmed.split(':')
  if (parts.length !== 3 || parts[0] !== PACKET_PREFIX) {
    throw new Error(`Invalid packet format: expected ${PACKET_PREFIX}:<HEX>:<LAT,LNG>`)
  }
  const hex = parts[1]
  const coordStr = parts[2]
  const byte = parseInt(hex, 16)
  if (isNaN(byte) || byte < 0x00 || byte > 0xff) {
    throw new Error(`Invalid hex byte: ${hex}`)
  }
  const incidentCode = (byte >> 4) & 0x0f
  const incidentType = INCIDENT_CODE_MAP[incidentCode]
  if (!incidentType) {
    throw new Error(`Unknown incident code: 0x${incidentCode.toString(16)}`)
  }
  const lowNibble = byte & 0x0f
  const medicalAidRequired = (lowNibble & MEDICAL_FLAG) !== 0
  const countRaw = lowNibble & 0x03
  const peopleCountBucket = [1, 2, 3].includes(countRaw) ? countRaw : 1

  const coordParts = coordStr.split(',')
  if (coordParts.length !== 2) {
    throw new Error(`Invalid coordinates: expected lat,lng`)
  }
  const lat = parseFloat(coordParts[0])
  const lng = parseFloat(coordParts[1])
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(`Coordinates out of bounds: ${coordStr}`)
  }
  return { incidentType, peopleCountBucket, medicalAidRequired, lat, lng }
}

describe('Ultra-Low-Bandwidth SOS Codec (NE1 Protocol)', () => {
  it('encodes and decodes a critical Flood packet accurately', () => {
    const input = {
      incidentType: 'Flood',
      peopleCountBucket: 2, // 2-4 people
      medicalAidRequired: true,
      lat: 26.1445,
      lng: 91.7362,
    }
    const packet = encodeSosPacket(input)
    assert.ok(packet.startsWith('NE1:'), 'Packet must start with NE1')
    assert.ok(packet.includes('26.1445,91.7362'))
    assert.ok(packet.length <= 26, `Packet should be ultra-compact, got ${packet.length} bytes`)

    const decoded = decodeSosPacket(packet)
    assert.equal(decoded.incidentType, 'Flood')
    assert.equal(decoded.peopleCountBucket, 2)
    assert.equal(decoded.medicalAidRequired, true)
    assert.equal(decoded.lat, 26.1445)
    assert.equal(decoded.lng, 91.7362)
  })

  it('handles Landslide and Trapped packet types', () => {
    const landslide = encodeSosPacket({
      incidentType: 'Landslide',
      peopleCountBucket: 3,
      medicalAidRequired: false,
      lat: 25.5788,
      lng: 91.8933,
    })
    const decLandslide = decodeSosPacket(landslide)
    assert.equal(decLandslide.incidentType, 'Landslide')
    assert.equal(decLandslide.peopleCountBucket, 3)
    assert.equal(decLandslide.medicalAidRequired, false)

    const trapped = encodeSosPacket({
      incidentType: 'Trapped',
      peopleCountBucket: 1,
      medicalAidRequired: true,
      lat: 27.0844,
      lng: 93.6053,
    })
    const decTrapped = decodeSosPacket(trapped)
    assert.equal(decTrapped.incidentType, 'Trapped')
    assert.equal(decTrapped.medicalAidRequired, true)
  })

  it('rejects malformed packets or out of bounds coordinates', () => {
    assert.throws(() => decodeSosPacket('INVALID:1A:26.1,91.7'), /Invalid packet format/)
    assert.throws(() => decodeSosPacket('NE1:1A:999.0,91.7'), /out of bounds/)
    assert.throws(() => encodeSosPacket({ incidentType: 'ZombieApocalypse', lat: 26.1, lng: 91.7 }), /Unknown incident type/)
  })
})
