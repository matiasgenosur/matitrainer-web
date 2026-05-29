import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText, formatActivityMessage } from '@/lib/whatsapp-hub'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
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
  const messageId = await sendText(body.to, msg)

  return NextResponse.json({
    ok: !!messageId,
    message_id: messageId,
    preview: msg,
  })
}
