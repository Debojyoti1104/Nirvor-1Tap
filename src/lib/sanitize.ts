/**
 * sanitize.ts — Input sanitization & security validation guards
 */

const HTML_TAG_REGEX = /<[^>]*>?/gm
const DANGEROUS_CHARS_REGEX = /[<>"'`]/g

export function stripHtml(input: string): string {
  if (typeof input !== 'string') return ''
  return input.replace(HTML_TAG_REGEX, '').trim()
}

export function sanitizeText(input: string, maxLength = 800): string {
  if (typeof input !== 'string') return ''
  const stripped = input.replace(HTML_TAG_REGEX, '').trim()
  return stripped.slice(0, maxLength)
}

export function isValidCoordinate(lat?: unknown, lng?: unknown): boolean {
  if (lat == null || lng == null) return true // coordinates are optional for some forms
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (!isFinite(lat) || !isFinite(lng)) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export const VALID_INCIDENT_CATEGORIES = [
  'Flood',
  'Landslide',
  'Medical',
  'Power',
  'Roadblock',
  'Structural',
  'Other',
] as const

export const VALID_SEVERITIES = ['Low', 'Moderate', 'High', 'Critical'] as const

export function isValidCategory(category: unknown): boolean {
  return typeof category === 'string' && VALID_INCIDENT_CATEGORIES.includes(category as typeof VALID_INCIDENT_CATEGORIES[number])
}

export function isValidSeverity(severity: unknown): boolean {
  return typeof severity === 'string' && VALID_SEVERITIES.includes(severity as typeof VALID_SEVERITIES[number])
}
