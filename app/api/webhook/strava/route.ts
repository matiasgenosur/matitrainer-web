import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText, formatActivityMessage } from '@/lib/whatsapp-hub'

const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'matitrainer_2026'
const MAX_HR = 180

// Strava webhook verification (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

function classifySession(type: string, distanceKm: number, movingTimeMin: number): string {
  if (['Hike', 'Walk'].includes(type)) return 'Senderismo'
  if (type === 'Soccer') return 'Fútbol'
  if (type !== 'Run') return type
  if (movingTimeMin > 0 && distanceKm / movingTimeMin > 0.13) return 'Recuperación'
  if (distanceKm < 8) return 'Fácil'
  if (distanceKm < 16) return 'Medio'
  if (distanceKm < 25) return 'Largo'
  return 'Largo+'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDetailActivity(a: any, zones?: any) {
  const distanceKm = Math.round((a.distance / 1000) * 100) / 100
  const movingTimeMin = Math.round((a.moving_time / 60) * 10) / 10
  const paceMinKm = distanceKm > 0 ? Math.round((movingTimeMin / distanceKm) * 100) / 100 : null
  const avgHr = a.average_heartrate || null
  const fcPct = avgHr && MAX_HR > 0 ? Math.round((avgHr / MAX_HR) * 1000) / 10 : null

  const startedAt = a.start_date_local || null
  const elapsedSec = a.elapsed_time || a.moving_time || 0
  const endedAt = startedAt
    ? new Date(new Date(startedAt).getTime() + elapsedSec * 1000).toISOString()
    : null

  const startLat = Array.isArray(a.start_latlng) && a.start_latlng.length === 2 ? a.start_latlng[0] : null
  const startLng = Array.isArray(a.start_latlng) && a.start_latlng.length === 2 ? a.start_latlng[1] : null
  const fatigue = Math.min(100, movingTimeMin * 0.5 + distanceKm * 2 + (a.total_elevation_gain || 0) * 0.05)

  // Calories: use Strava's computed value from detail endpoint; fall back to estimation
  const calories = a.calories && a.calories > 0
    ? Math.round(a.calories)
    : a.kilojoules && a.kilojoules >= 50
      ? Math.round(a.kilojoules * 0.239)
      : Math.round(movingTimeMin * 9)

  // HR zones from /activities/{id}/zones endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hrZone = Array.isArray(zones) ? zones.find((z: any) => z.type === 'heartrate') : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buckets: any[] = hrZone?.distribution_buckets ?? []
  const z1 = buckets[0] ? Math.round(buckets[0].time / 60 * 10) / 10 : null
  const z2 = buckets[1] ? Math.round(buckets[1].time / 60 * 10) / 10 : null
  const z3 = buckets[2] ? Math.round(buckets[2].time / 60 * 10) / 10 : null
  const z4 = buckets[3] ? Math.round(buckets[3].time / 60 * 10) / 10 : null
  const z5 = buckets[4] ? Math.round(buckets[4].time / 60 * 10) / 10 : null

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
    calories,
    avg_hr: avgHr,
    max_hr: a.max_heartrate || null,
    pace_min_km: paceMinKm,
    suffer_score: a.suffer_score || null,
    strava_link: `https://www.strava.com/activities/${a.id}`,
    session_type: classifySession(a.type, distanceKm, movingTimeMin),
    fc_pct: fcPct,
    fatigue_score: Math.round(fatigue),
    z1_min: z1,
    z2_min: z2,
    z3_min: z3,
    z4_min: z4,
    z5_min: z5,
  }
}

// Handle activity events (POST)
export async function POST(request: Request) {
  const body = await request.json()

  if (body.object_type === 'activity' && ['create', 'update'].includes(body.aspect_type)) {
    // Fetch full activity detail — includes city, country, lat/lng, calories, zones
    try {
      const token = await getAccessToken()
      const headers = { Authorization: `Bearer ${token}` }
      const actId = body.object_id

      const [actRes, zonesRes] = await Promise.all([
        fetch(`https://www.strava.com/api/v3/activities/${actId}`, { headers }),
        fetch(`https://www.strava.com/api/v3/activities/${actId}/zones`, { headers }),
      ])

      if (actRes.ok) {
        const activity = await actRes.json()
        const zones = zonesRes.ok ? await zonesRes.json() : null
        const record = mapDetailActivity(activity, zones)
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        await supabase.from('activities').upsert([record], { onConflict: 'id' })

        // Send WhatsApp notification (deduplicate by activity ID)
        if (body.aspect_type === 'create') {
          const notifKey = `strava_notif_${actId}`
          const { data: alreadySent } = await supabase
            .from('processed_messages')
            .select('hub_message_id')
            .eq('hub_message_id', notifKey)
            .single()

          if (!alreadySent) {
            await supabase.from('processed_messages').insert({ hub_message_id: notifKey }).then(() => {}, () => {})

            const { data: sessions } = await supabase
              .from('matitrainer_sessions')
              .select('whatsapp_group_id, trainee:matitrainer_users!trainee_id(strava_athlete_id)')
              .eq('status', 'active')
              .not('whatsapp_group_id', 'is', null)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = sessions?.find((s: any) => s.trainee?.strava_athlete_id === body.owner_id)
            if (match) {
              const msg = formatActivityMessage(record)
              sendText(match.whatsapp_group_id, msg).catch(e =>
                console.error('WA notification error:', e)
              )
            }
          }
        }
      }
    } catch (e) {
      console.error('Webhook detail sync error:', e)
    }

    // Also trigger general cron to recompute rolling metrics
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matitrainer-web.vercel.app'
    fetch(`${appUrl}/api/cron/sync-strava`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {})
  }

  return NextResponse.json({ received: true })
}
