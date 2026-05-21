import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// List recent completed readiness surveys.
// Resolves trainee via matitrainer_sessions join since some legacy
// rows lack a direct trainee_id column.
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const traineeId = url.searchParams.get('trainee_id')
  const days = parseInt(url.searchParams.get('days') ?? '30', 10)

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabaseAdmin
    .from('readiness_surveys')
    .select(
      'id, session_id, survey_date, sleep_quality, energy_level, muscle_state, stress_level, mood, readiness_score, completed, created_at, matitrainer_sessions!session_id(trainee_id)'
    )
    .gte('created_at', since.toISOString())
    .eq('completed', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'server_error', message: error.message },
      { status: 500 }
    )
  }

  type SessionRef = { trainee_id: string }
  type RawRow = Record<string, unknown> & {
    matitrainer_sessions?: SessionRef | SessionRef[] | null
  }

  function traineeOf(r: RawRow): string | null {
    const ms = r.matitrainer_sessions
    if (!ms) return null
    if (Array.isArray(ms)) return ms[0]?.trainee_id ?? null
    return ms.trainee_id ?? null
  }

  let rows = ((data ?? []) as unknown) as RawRow[]
  if (traineeId) {
    rows = rows.filter((r) => traineeOf(r) === traineeId)
  }

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      trainee_id: traineeOf(r),
      matitrainer_sessions: undefined,
    }))
  )
}
