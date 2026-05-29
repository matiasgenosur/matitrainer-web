import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatActivityMessage } from '@/lib/whatsapp-hub'

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key !== process.env.TRAINER_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    to?: string
    activity_id?: number | string
  } | null

  if (!body?.to || !body?.activity_id) {
    return NextResponse.json(
      { error: 'missing_fields', need: ['to', 'activity_id'] },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: activity, error } = await supabase
    .from('activities')
    .select(
      'name, type, distance_km, moving_time_min, pace_min_km, avg_hr, elevation_m, strava_link, session_type, z1_min, z2_min, z3_min, z4_min, z5_min'
    )
    .eq('id', body.activity_id)
    .single()

  if (error || !activity) {
    return NextResponse.json(
      { error: 'activity_not_found', message: error?.message },
      { status: 404 }
    )
  }

  const msg = formatActivityMessage(activity)

  // Inline hub call so we can surface the actual response body for debugging
  const hubRes = await fetch(`${process.env.HUB_URL}/send`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.HUB_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: body.to, message: msg }),
  })
  const hubBody = await hubRes.text()

  return NextResponse.json({
    ok: hubRes.ok,
    hub_status: hubRes.status,
    hub_body: hubBody,
    preview: msg,
  })
}
