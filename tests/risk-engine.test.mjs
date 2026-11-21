import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function computeRiskAssessment(hub, weather) {
  let floodRisk = 0
  let landslideRisk = 0

  // 1. Rainfall score (0-40)
  if (weather.rainfall > 35) floodRisk += 40
  else if (weather.rainfall > 15) floodRisk += 25
  else if (weather.rainfall > 5) floodRisk += 12

  // 2. 24h accumulated precipitation (0-35)
  if (weather.precipitation24h > 100) floodRisk += 35
  else if (weather.precipitation24h > 50) floodRisk += 20
  else if (weather.precipitation24h > 20) floodRisk += 10

  // 3. Terrain weighting
  if (hub.terrain === 'valley_flood' || hub.floodZone) {
    floodRisk = Math.min(100, Math.round(floodRisk * 1.25))
  }

  // Landslide calculation
  if (hub.terrain === 'hilly_landslide' || hub.landslideZone) {
    if (weather.precipitation24h > 80) landslideRisk += 45
    else if (weather.precipitation24h > 40) landslideRisk += 25
    if (weather.rainfall > 20) landslideRisk += 35
    else if (weather.rainfall > 8) landslideRisk += 18
    if (hub.elevation > 1000) landslideRisk = Math.round(landslideRisk * 1.15)
  }

  const overallScore = Math.max(floodRisk, landslideRisk)
  let level = 'Low'
  if (overallScore >= 75) level = 'Critical'
  else if (overallScore >= 50) level = 'High'
  else if (overallScore >= 25) level = 'Moderate'

  return { floodRisk, landslideRisk, overallScore, level }
}

describe('Civic Disaster Risk Engine', () => {
  it('correctly flags Critical risk for valley flood zones with torrential monsoon rain', () => {
    const guwahatiHub = {
      id: 'guwahati',
      name: 'Guwahati',
      terrain: 'valley_flood',
      floodZone: true,
      elevation: 55,
    }
    const extremeWeather = {
      rainfall: 45,            // > 35mm
      precipitation24h: 120,   // > 100mm
      windSpeed: 40,
    }

    const assessment = computeRiskAssessment(guwahatiHub, extremeWeather)
    assert.equal(assessment.level, 'Critical')
    assert.ok(assessment.floodRisk >= 75)
    assert.ok(assessment.overallScore >= 75)
  })

  it('correctly assesses landslide vulnerability in high-elevation hilly terrains (Shillong)', () => {
    const shillongHub = {
      id: 'shillong',
      name: 'Shillong',
      terrain: 'hilly_landslide',
      landslideZone: true,
      elevation: 1496,
    }
    const hillyRain = {
      rainfall: 25,
      precipitation24h: 90,
      windSpeed: 25,
    }

    const assessment = computeRiskAssessment(shillongHub, hillyRain)
    assert.ok(assessment.landslideRisk > assessment.floodRisk)
    assert.ok(assessment.overallScore >= 50)
    assert.ok(['High', 'Critical'].includes(assessment.level))
  })

  it('returns Low risk under dry and mild conditions', () => {
    const hub = {
      id: 'jorhat',
      name: 'Jorhat',
      terrain: 'valley_flood',
      floodZone: true,
      elevation: 116,
    }
    const dryWeather = {
      rainfall: 0,
      precipitation24h: 2,
      windSpeed: 10,
    }

    const assessment = computeRiskAssessment(hub, dryWeather)
    assert.equal(assessment.level, 'Low')
    assert.equal(assessment.overallScore, 0)
  })
})
