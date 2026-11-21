/**
 * sosCodec.ts — Ultra-Low-Bandwidth SOS Packet Encoder/Decoder
 *
 * Packet format: NE1:<2-hex-byte>:<lat_4dp>,<lng_4dp>
 * Example:       NE1:1A:26.1445,91.7362  (~24 bytes, SMS/2G safe)
 *
 * Header byte layout:
 *   High nibble (bits 7–4): Incident type
 *     0x1 = Flood
 *     0x2 = Landslide
 *     0x3 = Medical
 *     0x4 = Trapped
 *     0x5 = Roadblock
 *
 *   Low nibble (bits 3–0): People count + medical flag
 *     bits 1–0: count bucket  1=1 person, 2=2–4, 3=5+
 *     bit  3:   medical aid flag (+0x8)
 *
 * Zero external dependencies — pure TypeScript.
 */

import type { SosIncidentType, SosPacketInput, SosPacketDecoded } from '@/types'

// ─── Constants ─────────────────────────────────────────────────────────────

const PACKET_PREFIX = 'NE1'

const INCIDENT_TYPE_MAP: Record<SosIncidentType, number> = {
  Flood:     0x1,
  Landslide: 0x2,
  Medical:   0x3,
  Trapped:   0x4,
  Roadblock: 0x5,
}

const INCIDENT_CODE_MAP: Record<number, SosIncidentType> = {
  0x1: 'Flood',
  0x2: 'Landslide',
  0x3: 'Medical',
  0x4: 'Trapped',
  0x5: 'Roadblock',
}

const PEOPLE_COUNT_LABELS: Record<1 | 2 | 3, string> = {
  1: '1 person',
  2: '2–4 people',
  3: '5+ people',
}

const MEDICAL_FLAG = 0x8

// ─── Encoder ───────────────────────────────────────────────────────────────

/**
 * Encodes an SOS input into a compact NE1 packet string.
 * Returns the packet string on success, throws on invalid input.
 */
export function encodeSosPacket(input: SosPacketInput): string {
  // Validate incident type
  const incidentCode = INCIDENT_TYPE_MAP[input.incidentType]
  if (incidentCode === undefined) {
    throw new Error(`Invalid incident type: "${input.incidentType}"`)
  }

  // Validate people count bucket
  if (![1, 2, 3].includes(input.peopleCount)) {
    throw new Error(`Invalid peopleCount: ${input.peopleCount}. Must be 1, 2, or 3.`)
  }

  // Validate coordinates
  if (!isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
    throw new Error(`Invalid latitude: ${input.lat}`)
  }
  if (!isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    throw new Error(`Invalid longitude: ${input.lng}`)
  }

  // Build header byte
  const highNibble = (incidentCode & 0xf) << 4
  const medFlag = input.medicalAidNeeded ? MEDICAL_FLAG : 0x0
  const lowNibble = (medFlag | (input.peopleCount & 0x3)) & 0xf
  const headerByte = highNibble | lowNibble

  // Format as 2-char uppercase hex
  const headerHex = headerByte.toString(16).toUpperCase().padStart(2, '0')

  // Format coordinates to 4 decimal places (±11m precision — adequate for rescue)
  const latStr = input.lat.toFixed(4)
  const lngStr = input.lng.toFixed(4)

  return `${PACKET_PREFIX}:${headerHex}:${latStr},${lngStr}`
}

// ─── Decoder ───────────────────────────────────────────────────────────────

/**
 * Decodes a NE1 packet string into structured data.
 * Returns decoded object on success, throws on malformed input.
 */
export function decodeSosPacket(packet: string): SosPacketDecoded {
  const trimmed = packet.trim().toUpperCase()

  // Structural validation
  if (!trimmed.startsWith(`${PACKET_PREFIX}:`)) {
    throw new Error(`Invalid packet: must start with "${PACKET_PREFIX}:". Got: "${packet}"`)
  }

  const parts = trimmed.split(':')
  if (parts.length !== 3) {
    throw new Error(`Invalid packet structure: expected 3 colon-separated parts, got ${parts.length}. Format: NE1:<HEX>:<lat>,<lng>`)
  }

  const [, hexPart, coordPart] = parts

  // Validate hex header
  if (!/^[0-9A-F]{2}$/.test(hexPart)) {
    throw new Error(`Invalid header hex "${hexPart}": must be exactly 2 uppercase hex digits.`)
  }

  const headerByte = parseInt(hexPart, 16)
  const highNibble = (headerByte >> 4) & 0xf
  const lowNibble  = headerByte & 0xf

  // Decode incident type
  const incidentType = INCIDENT_CODE_MAP[highNibble]
  if (!incidentType) {
    throw new Error(`Unknown incident type code 0x${highNibble.toString(16).toUpperCase()} in header "${hexPart}". Valid codes: 1–5.`)
  }

  // Decode people count (bits 1–0 of low nibble)
  const countBits = lowNibble & 0x3
  if (countBits === 0 || countBits > 3) {
    throw new Error(`Invalid people count bits ${countBits} in header "${hexPart}". Must be 1, 2, or 3.`)
  }
  const peopleCountBucket = countBits as 1 | 2 | 3

  // Decode medical flag (bit 3 of low nibble)
  const medicalAidNeeded = (lowNibble & MEDICAL_FLAG) !== 0

  // Decode coordinates — accept original case from trimmed input
  const originalParts = packet.trim().split(':')
  const coordPartOriginal = originalParts[2] ?? coordPart
  const coordMatch = coordPartOriginal.match(/^(-?[\d.]+),(-?[\d.]+)$/)
  if (!coordMatch) {
    throw new Error(`Invalid coordinate format "${coordPartOriginal}": expected "<lat>,<lng>" (e.g. "26.1445,91.7362").`)
  }

  const lat = parseFloat(coordMatch[1])
  const lng = parseFloat(coordMatch[2])

  if (!isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error(`Latitude ${lat} out of range [-90, 90].`)
  }
  if (!isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error(`Longitude ${lng} out of range [-180, 180].`)
  }

  return {
    incidentType,
    peopleCountBucket,
    peopleCountLabel: PEOPLE_COUNT_LABELS[peopleCountBucket],
    medicalAidNeeded,
    lat,
    lng,
    raw: packet.trim(),
  }
}

// ─── Helpers (re-exported for UI use) ──────────────────────────────────────

export const SOS_INCIDENT_TYPES: SosIncidentType[] = [
  'Flood', 'Landslide', 'Medical', 'Trapped', 'Roadblock',
]

export { PEOPLE_COUNT_LABELS }

/** Generates a demo/sample packet for the Guwahati hub */
export const SAMPLE_PACKET = 'NE1:1A:26.1445,91.7362'
