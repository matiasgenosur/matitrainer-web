import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_HR = 180

function classifySession(type: string, distanceKm: number, movingTimeMin: number): string {
  if (['Hike', 'Walk'].includes(type)) return 'Senderismo'
  if (type === 'Soccer') return 'Fútbol'
  if (type !== 'Run') return type
  if (movingTimeMin > 0 && distanceKm / movingTimeMin > 0.13) return 'Recuperación' // > 7:30/km approx
  if (distanceKm < 8) return 'Fácil'
  if (distanceKm < 16) return 'Medio'
  if (distanceKm < 25) return 'Largo'
  return 'Largo+'
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Strava token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapActivity(a: any) {
  const distanceKm = Math.round((a.distance / 1000) * 100) / 100
  const movingTimeMin = Math.round((a.moving_time / 60) * 10) / 10
  const paceMinKm = distanceKm > 0 ? Math.round((movingTimeMin / distanceKm) * 100) / 100 : null
  const avgHr = a.average_heartrate || null
  const fcPct = avgHr && MAX_HR > 0 ? Math.round((avgHr / MAX_HR) * 1000) / 10 : null

  // Timestamps
  const startedAt = a.start_date_local || null
  const elapsedSec = a.elapsed_time || a.moving_time || 0
  const endedAt = startedAt
    ? new Date(new Date(startedAt).getTime() + elapsedSec * 1000).toISOString()
    : null

  // Location (lat/lng available in list; city/country only in detail endpoint)
  const startLat = Array.isArray(a.start_latlng) && a.start_latlng.length === 2 ? a.start_latlng[0] : null
  const startLng = Array.isArray(a.start_latlng) && a.start_latlng.length === 2 ? a.start_latlng[1] : null

  return {
    id: a.id,
    name: a.name,
    type: a.type,
    date: a.start_date_local.slice(0, 10),
    started_at: startedAt,
    ended_at: endedAt,
    start_lat: startLat,
    start_lng: startLng,
    city: a.location_city || null,
    country: a.location_country || null,
    distance_km: distanceKm,
    moving_time_min: movingTimeMin,
    elevation_m: a.total_elevation_gain || 0,
    fatigue_score: Math.round(Math.min(100, movingTimeMin * 0.5 + distanceKm * 2 + (a.total_elevation_gain || 0) * 0.05)),
    avg_hr: avgHr,
    max_hr: a.max_heartrate || null,
    pace_min_km: paceMinKm,
    suffer_score: a.suffer_score || null,
    strava_link: `https://www.strava.com/activities/${a.id}`,
    session_type: classifySession(a.type, distanceKm, movingTimeMin),
    fc_pct: fcPct,
  }
}

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const token = await getAccessToken()

    const res = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=50&page=1',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
    const activities = await res.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Compute rolling weekly_km and fatigue_7d per activity
    const sorted = [...activities].sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = sorted.map((a: any) => {
      const base = mapActivity(a)
      const actDate = new Date(a.start_date_local)
      const weekAgo = new Date(actDate); weekAgo.setDate(weekAgo.getDate() - 7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weeklyKm = sorted.filter((x: any) => {
        const d = new Date(x.start_date_local)
        return d >= weekAgo && d <= actDate && x.type === 'Run'
      }).reduce((s: number, x: any) => s + x.distance / 1000, 0) // eslint-disable-line @typescript-eslint/no-explicit-any

      const fatigue7d = sorted.filter((x: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const d = new Date(x.start_date_local)
        return d >= weekAgo && d <= actDate
      }).reduce((s: number, x: any) => s + (x.suffer_score || 0), 0) // eslint-disable-line @typescript-eslint/no-explicit-any

      return {
        ...base,
        weekly_km: Math.round(weeklyKm * 10) / 10,
        fatigue_7d: fatigue7d || null,
      }
    })

    const { error } = await supabase
      .from('activities')
      .upsert(records, { onConflict: 'id' })

    if (error) throw new Error(error.message)

    return NextResponse.json({ synced: records.length, ok: true })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
