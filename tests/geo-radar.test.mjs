import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0
  }
  const R = 6371
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

function getGoogleMapsDirectionsUrl(destinationLat, destinationLng, originLat, originLng) {
  if (originLat != null && originLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destinationLat},${destinationLng}&travelmode=driving`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`
}

function getNativeGeoUri(lat, lng, label = 'Emergency Victim Location') {
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`
}

describe('Geo & Radar Distance Utils', () => {
  it('calculates accurate distance between Guwahati and Shillong (~68 km)', () => {
    const guwahati = { lat: 26.1445, lng: 91.7362 }
    const shillong = { lat: 25.5788, lng: 91.8933 }
    const dist = getDistanceKm(guwahati.lat, guwahati.lng, shillong.lat, shillong.lng)
    assert.ok(dist > 60 && dist < 75, `Expected ~68km, got ${dist.toFixed(1)}km`)
  })

  it('returns 0 when coordinates are identical', () => {
    const dist = getDistanceKm(26.1445, 91.7362, 26.1445, 91.7362)
    assert.equal(dist, 0)
  })

  it('handles non-finite coordinates gracefully without throwing', () => {
    assert.equal(getDistanceKm(NaN, 91.7362, 26.1445, 91.7362), 0)
    assert.equal(getDistanceKm(26.1445, Infinity, 26.1445, 91.7362), 0)
  })

  it('correctly filters targets within 10km responder radar', () => {
    const origin = { lat: 26.1445, lng: 91.7362 }
    const nearby = { lat: 26.1500, lng: 91.7400 } // ~0.7 km away
    const far = { lat: 26.3000, lng: 92.0000 }    // ~30 km away

    const isNearbyWithin10km = getDistanceKm(origin.lat, origin.lng, nearby.lat, nearby.lng) <= 10
    const isFarWithin10km = getDistanceKm(origin.lat, origin.lng, far.lat, far.lng) <= 10

    assert.equal(isNearbyWithin10km, true)
    assert.equal(isFarWithin10km, false)
  })

  it('generates valid Google Maps navigation URLs', () => {
    const urlWithOrigin = getGoogleMapsDirectionsUrl(26.1, 91.7, 26.0, 91.6)
    assert.ok(urlWithOrigin.includes('origin=26,91.6'))
    assert.ok(urlWithOrigin.includes('destination=26.1,91.7'))
    assert.ok(urlWithOrigin.includes('travelmode=driving'))

    const urlWithoutOrigin = getGoogleMapsDirectionsUrl(26.1, 91.7)
    assert.ok(urlWithoutOrigin.includes('destination=26.1,91.7'))
    assert.ok(!urlWithoutOrigin.includes('origin='))
  })

  it('generates valid native geo: URIs for offline map apps', () => {
    const geoUri = getNativeGeoUri(26.1445, 91.7362, 'Flood Alert')
    assert.ok(geoUri.startsWith('geo:26.1445,91.7362?q='))
    assert.ok(geoUri.includes('Flood%20Alert'))
  })
})
