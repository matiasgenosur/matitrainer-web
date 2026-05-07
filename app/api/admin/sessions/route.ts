import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function checkAdmin(request: Request): boolean {
  return request.headers.get('x-admin-key') === process.env.ADMIN_SECRET
}

export async function POST(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trainer_id, trainee_id } = await request.json()
  if (!trainer_id || !trainee_id) {
    return NextResponse.json({ error: 'trainer_id and trainee_id required' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from('matitrainer_sessions')
    .insert({ trainer_id, trainee_id, status: 'pending' })
    .select('id')
    .single()

  if (sessionErr || !session) {
    return NextResponse.json({ error: sessionErr?.message || 'Failed to create session' }, { status: 500 })
  }

  // Generate bind token (32 random chars)
  const rawToken = crypto.randomBytes(24).toString('base64url').slice(0, 32)
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  // Token expires in 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: tokenErr } = await supabase
    .from('matitrainer_bind_tokens')
    .insert({ session_id: session.id, token_hash: tokenHash, expires_at: expiresAt })

  if (tokenErr) {
    return NextResponse.json({ error: tokenErr.message }, { status: 500 })
  }

  return NextResponse.json({
    session_id: session.id,
    bind_token: rawToken,
    expires_at: expiresAt,
  }, { status: 201 })
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('matitrainer_sessions')
    .select(`
      id, status, whatsapp_group_id, created_at, activated_at, revoked_at,
      trainer:matitrainer_users!trainer_id(id, display_name, whatsapp_number),
      trainee:matitrainer_users!trainee_id(id, display_name, whatsapp_number, strava_athlete_id)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
