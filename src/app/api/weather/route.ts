import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      current: 'rain,windspeed_10m,temperature_2m,relativehumidity_2m',
      daily: 'precipitation_sum',
      forecast_days: '1',
      timezone: 'Asia/Kolkata',
      windspeed_unit: 'kmh',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return NextResponse.json({ error: 'Weather API error' }, { status: 502 })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch weather', detail: String(err) }, { status: 500 })
  }
}
