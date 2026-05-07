import crypto from 'node:crypto'

const HUB_URL = () => process.env.HUB_URL!
const HUB_API_KEY = () => process.env.HUB_API_KEY!
const WEBHOOK_SECRET = () => process.env.WEBHOOK_SECRET!

export function verifyHmac(rawBody: string, signature: string): boolean {
  const secret = WEBHOOK_SECRET()
  if (!secret || !signature) return false
  const expected =
    'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function sendText(to: string, text: string): Promise<string | null> {
  try {
    const res = await fetch(`${HUB_URL()}/send`, {
      method: 'POST',
      headers: { 'x-api-key': HUB_API_KEY(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message: text }),
    })
    if (!res.ok) {
      console.error(`Hub sendText error: ${res.status}`)
      return null
    }
    const data = await res.json()
    return data.message_id ?? null
  } catch (e) {
    console.error('Hub sendText failed:', e)
    return null
  }
}

export async function sendPoll(
  to: string,
  name: string,
  values: string[],
  selectableCount: number,
  correlationId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${HUB_URL()}/send-poll`, {
      method: 'POST',
      headers: { 'x-api-key': HUB_API_KEY(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        name,
        values,
        selectable_count: selectableCount,
        correlation_id: correlationId,
      }),
    })
    if (!res.ok) {
      console.error(`Hub sendPoll error: ${res.status}`)
      return null
    }
    const data = await res.json()
    return data.message_id ?? null
  } catch (e) {
    console.error('Hub sendPoll failed:', e)
    return null
  }
}

export function formatActivityMessage(record: {
  name: string
  type: string
  distance_km: number
  moving_time_min: number
  pace_min_km: number | null
  avg_hr: number | null
  elevation_m: number
  strava_link: string
  session_type?: string
}): string {
  const icon = record.type === 'Hike' ? '🥾' : record.type === 'Soccer' ? '⚽' : '🏃'
  const dist = record.distance_km > 0 ? `${record.distance_km.toFixed(1)} km` : '—'
  const time = `${Math.round(record.moving_time_min)} min`

  let pace = '—'
  if (record.pace_min_km && record.pace_min_km > 0) {
    const m = Math.floor(record.pace_min_km)
    const s = Math.round((record.pace_min_km - m) * 60)
    pace = `${m}:${s.toString().padStart(2, '0')}/km`
  }

  const hr = record.avg_hr ? `${Math.round(record.avg_hr)} bpm` : '—'
  const elev = record.elevation_m > 0 ? `${Math.round(record.elevation_m)}m` : '—'

  return [
    `${icon} *Actividad completada*`,
    `📋 ${record.name}`,
    `📏 ${dist} | ⏱ ${time}`,
    record.pace_min_km ? `⚡ Ritmo: ${pace}` : null,
    `❤️ FC: ${hr}`,
    record.elevation_m > 0 ? `⛰️ Desnivel: ${elev}` : null,
    `🔗 ${record.strava_link}`,
  ]
    .filter(Boolean)
    .join('\n')
}
