import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  const { role, display_name, whatsapp_number, strava_athlete_id } = await request.json()

  if (!role || !display_name || !['trainer', 'trainee'].includes(role)) {
    return NextResponse.json({ error: 'role (trainer|trainee) and display_name required' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('matitrainer_users')
    .insert({ role, display_name, whatsapp_number: whatsapp_number || null, strava_athlete_id: strava_athlete_id || null })
    .select('id, role, display_name, whatsapp_number, strava_athlete_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('matitrainer_users')
    .select('id, role, display_name, whatsapp_number, strava_athlete_id, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
