import { NextResponse } from 'next/server'

const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'matitrainer_2026'

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

// Handle activity events (POST)
export async function POST(request: Request) {
  const body = await request.json()

  // Trigger sync when a new activity is created or updated
  if (body.object_type === 'activity' && ['create', 'update'].includes(body.aspect_type)) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://matitrainer-web.vercel.app'
    // Fire-and-forget sync
    fetch(`${appUrl}/api/cron/sync-strava`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {})
  }

  return NextResponse.json({ received: true })
}
