import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const HTML_TAG_REGEX = /<[^>]*>?/gm

function stripHtml(input) {
  if (typeof input !== 'string') return ''
  return input.replace(HTML_TAG_REGEX, '').trim()
}

function sanitizeText(input, maxLength = 800) {
  if (typeof input !== 'string') return ''
  return stripHtml(input).slice(0, maxLength)
}

function isValidCoordinate(lat, lng) {
  if (lat == null || lng == null) return true
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

const VALID_INCIDENT_CATEGORIES = [
  'Flood',
  'Landslide',
  'Medical',
  'Power',
  'Roadblock',
  'Structural',
  'Other',
]

const VALID_SEVERITIES = ['Low', 'Moderate', 'High', 'Critical']

describe('Security & Input Sanitization Guards', () => {
  it('strips dangerous HTML and script tags from citizen descriptions', () => {
    const dirty = '<script>alert("hacked")</script>Flood near Bharalu river<img src=x onerror=alert(1)>'
    const cleaned = sanitizeText(dirty)
    assert.equal(cleaned, 'alert("hacked")Flood near Bharalu river')
    assert.ok(!cleaned.includes('<script>'))
    assert.ok(!cleaned.includes('<img'))
  })

  it('caps string lengths to prevent payload DOS attacks', () => {
    const huge = 'A'.repeat(5000)
    const sanitized = sanitizeText(huge, 800)
    assert.equal(sanitized.length, 800)
  })

  it('validates GPS latitude and longitude bounds correctly', () => {
    assert.equal(isValidCoordinate(26.1445, 91.7362), true)
    assert.equal(isValidCoordinate(95.0, 91.7), false, 'Lat > 90 must fail')
    assert.equal(isValidCoordinate(-95.0, 91.7), false, 'Lat < -90 must fail')
    assert.equal(isValidCoordinate(26.1, 190.0), false, 'Lng > 180 must fail')
    assert.equal(isValidCoordinate('26.1', '91.7'), false, 'Non-number coordinates must fail')
    assert.equal(isValidCoordinate(null, null), true, 'Nullable coordinates are acceptable for non-GPS reports')
  })

  it('strictly validates category and severity against allowed enums', () => {
    assert.ok(VALID_INCIDENT_CATEGORIES.includes('Flood'))
    assert.ok(VALID_INCIDENT_CATEGORIES.includes('Landslide'))
    assert.ok(!VALID_INCIDENT_CATEGORIES.includes('SQL_INJECTION; DROP TABLE'))

    assert.ok(VALID_SEVERITIES.includes('Critical'))
    assert.ok(!VALID_SEVERITIES.includes('SuperExtreme'))
  })
})
