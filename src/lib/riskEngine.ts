import type { Hub, WeatherData, RiskAssessment, RiskLevel } from '@/types'

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'

export async function fetchWeatherData(hub: Hub): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: hub.lat.toString(),
    longitude: hub.lng.toString(),
    current: 'rain,windspeed_10m,temperature_2m,relativehumidity_2m',
    daily: 'precipitation_sum',
    forecast_days: '1',
    timezone: 'Asia/Kolkata',
    windspeed_unit: 'kmh',
  })

  try {
    const res = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const current = data.current ?? {}
    const daily = data.daily ?? {}

    return {
      rainfall: typeof current.rain === 'number' ? current.rain : 0,
      precipitation24h:
        Array.isArray(daily.precipitation_sum) && daily.precipitation_sum[0] != null
          ? daily.precipitation_sum[0] : 0,
      windSpeed: typeof current.windspeed_10m === 'number' ? current.windspeed_10m : 0,
      temperature: typeof current.temperature_2m === 'number' ? current.temperature_2m : 25,
      humidity: typeof current.relativehumidity_2m === 'number' ? current.relativehumidity_2m : 70,
      timestamp: new Date().toISOString(),
      source: 'live',
    }
  } catch {
    return generateFallbackWeather(hub)
  }
}

function generateFallbackWeather(hub: Hub): WeatherData {
  const month = new Date().getMonth()
  const isMonsoon = month >= 5 && month <= 9
  const isHilly = hub.terrain === 'hilly_landslide'

  return {
    rainfall: isHilly ? (isMonsoon ? 8.5 : 1.2) : (isMonsoon ? 5.0 : 0.8),
    precipitation24h: isHilly ? (isMonsoon ? 142 : 22) : (isMonsoon ? 95 : 15),
    windSpeed: isMonsoon ? 28 : 12,
    temperature: hub.elevation > 1000 ? 15 : 28,
    humidity: isMonsoon ? 88 : 65,
    timestamp: new Date().toISOString(),
    source: 'fallback',
  }
}

export function computeRiskAssessment(hub: Hub, weather: WeatherData): RiskAssessment {
  let floodRisk = 0
  let landslideRisk = 0

  if (hub.floodZone) {
    if (weather.rainfall > 15) floodRisk += 35
    else if (weather.rainfall > 8) floodRisk += 22
    else if (weather.rainfall > 3) floodRisk += 12
    else floodRisk += 3

    if (weather.precipitation24h > 200) floodRisk += 40
    else if (weather.precipitation24h > 100) floodRisk += 28
    else if (weather.precipitation24h > 50) floodRisk += 15
    else if (weather.precipitation24h > 20) floodRisk += 7
    else floodRisk += 2

    if (hub.elevation < 50) floodRisk += 15
    else if (hub.elevation < 200) floodRisk += 8
    if (weather.windSpeed > 50) floodRisk += 10
    else if (weather.windSpeed > 30) floodRisk += 5
  } else {
    if (weather.precipitation24h > 150) floodRisk += 20
    else if (weather.precipitation24h > 80) floodRisk += 10
  }

  if (hub.landslideZone) {
    if (weather.rainfall > 20) landslideRisk += 30
    else if (weather.rainfall > 10) landslideRisk += 20
    else if (weather.rainfall > 5) landslideRisk += 12
    else landslideRisk += 3

    if (weather.precipitation24h > 150) landslideRisk += 40
    else if (weather.precipitation24h > 80) landslideRisk += 28
    else if (weather.precipitation24h > 40) landslideRisk += 16
    else if (weather.precipitation24h > 20) landslideRisk += 8
    else landslideRisk += 2

    if (hub.elevation > 1000) landslideRisk += 15
    else if (hub.elevation > 500) landslideRisk += 8

    if (weather.humidity > 90) landslideRisk += 10
    else if (weather.humidity > 80) landslideRisk += 5
  }

  let score: number
  if (hub.terrain === 'valley_flood') score = floodRisk * 0.75 + landslideRisk * 0.25
  else if (hub.terrain === 'hilly_landslide') score = floodRisk * 0.25 + landslideRisk * 0.75
  else score = floodRisk * 0.5 + landslideRisk * 0.5

  score = Math.min(100, Math.round(score))
  floodRisk = Math.min(100, Math.round(floodRisk))
  landslideRisk = Math.min(100, Math.round(landslideRisk))

  let level: RiskLevel
  let color: string
  if (score >= 70) { level = 'CRITICAL'; color = '#DC2626' }
  else if (score >= 45) { level = 'HIGH'; color = '#D97706' }
  else if (score >= 20) { level = 'MODERATE'; color = '#D97706' }
  else { level = 'LOW'; color = '#059669' }

  const primaryHazard = hub.terrain === 'hilly_landslide'
    ? 'Landslide' : hub.terrain === 'valley_flood'
    ? 'Flood' : floodRisk > landslideRisk ? 'Flood' : 'Landslide'

  const advisories: Record<RiskLevel, string> = {
    CRITICAL: `CRITICAL ${primaryHazard.toUpperCase()} ALERT: Immediate evacuation recommended in ${hub.name}. Contact district control room now.`,
    HIGH: `High ${primaryHazard} risk in ${hub.name}. Avoid low-lying/slope areas. Stay alert for official evacuation orders.`,
    MODERATE: `Moderate ${primaryHazard} watch active. Monitor conditions. Keep emergency supplies ready.`,
    LOW: `Conditions stable in ${hub.name}. Continue monitoring weather updates.`,
  }

  return {
    score, level, floodRisk, landslideRisk,
    earthquakeAlert: false,
    primaryHazard,
    advisoryText: advisories[level],
    color,
  }
}

export function getRiskLevelColor(level: RiskLevel): string {
  return { CRITICAL: '#DC2626', HIGH: '#D97706', MODERATE: '#D97706', LOW: '#059669' }[level]
}

export function getRiskBgClass(level: RiskLevel): string {
  return {
    CRITICAL: 'bg-red-50 border-red-200 text-red-700',
    HIGH: 'bg-amber-50 border-amber-200 text-amber-700',
    MODERATE: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    LOW: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }[level]
}
