/**
 * geoUtils.ts — Geodesic distance calculation & navigation link builders
 */

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using Haversine formula.
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!isFinite(lat1) || !isFinite(lon1) || !isFinite(lat2) || !isFinite(lon2)) {
    return 0
  }
  const R = 6371 // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Builds Google Maps turn-by-turn directions URL from responder's origin to target destination.
 */
export function getGoogleMapsDirectionsUrl(
  destinationLat: number,
  destinationLng: number,
  originLat?: number | null,
  originLng?: number | null
): string {
  if (originLat != null && originLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destinationLat},${destinationLng}&travelmode=driving`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`
}

/**
 * Builds native offline geo URI supported by Android/iOS map apps (Maps.me, OsmAnd, Google Maps offline)
 */
export function getNativeGeoUri(lat: number, lng: number, label = 'Emergency Victim Location'): string {
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`
}
