import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText, sendPoll } from '@/lib/whatsapp-hub'

const SURVEY_HOUR = 8 // Send surveys at 8AM local time

const POLL_QUESTIONS = [
  { field: 'sleep_quality', name: '😴 ¿Qué tan reparador fue tu descanso? (1: Muy malo - 5: Excelente)' },
  { field: 'energy_level', name: '⚡ ¿Cómo te sientes físicamente hoy? (1: Agotado - 5: Lleno de energía)' },
  { field: 'muscle_state', name: '💪 ¿Sientes dolor o rigidez (DOMS)? (1: Dolor intenso - 5: Sin molestias)' },
  { field: 'stress_level', name: '🧠 ¿Nivel de estrés fuera del gym? (1: Muy alto - 5: Muy bajo/Relajado)' },
  { field: 'mood', name: '🔥 ¿Qué tanta motivación tienes para entrenar? (1: Nula - 5: Máxima)' },
]

/** Check if it's currently ~8AM in the given timezone (within the current hour) */
function isMorningIn(timezone: string): boolean {
  try {
    const now = new Date()
    const localHour = parseInt(
      now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
    )
    return localHour === SURVEY_HOUR
  } catch {
    return false
  }
}

/** Get yesterday's date in a specific timezone */
function yesterdayIn(timezone: string): string {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  local.setDate(local.getDate() - 1)
  return local.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get active sessions with timezone
  const { data: sessions } = await supabase
    .from('matitrainer_sessions')
    .select(`
      id, whatsapp_group_id, timezone,
      trainee:matitrainer_users!trainee_id(display_name, strava_athlete_id)
    `)
    .eq('status', 'active')
    .not('whatsapp_group_id', 'is', null)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No active sessions' })
  }

  const surveysSent: string[] = []
  const skipped: string[] = []

  for (const session of sessions) {
    const tz = session.timezone || 'America/Santiago'

    // Only send if it's 8AM in the session's timezone
    if (!isMorningIn(tz)) {
      skipped.push(`${tz}: not morning`)
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trainee = session.trainee as any
    if (!trainee) continue

    const yesterday = yesterdayIn(tz)

    // Find ANY activities from yesterday (not just Crossfit)
    const { data: acts } = await supabase
      .from('activities')
      .select('id, name, date')
      .eq('date', yesterday)
      .order('moving_time_min', { ascending: false })
      .limit(1)

    if (!acts || acts.length === 0) {
      skipped.push(`${trainee.display_name}: no activities on ${yesterday}`)
      continue
    }

    // Check if survey already exists for this session + date
    const { data: existing } = await supabase
      .from('readiness_surveys')
      .select('id')
      .eq('session_id', session.id)
      .eq('survey_date', yesterday)
      .single()

    if (existing) {
      skipped.push(`${trainee.display_name}: survey already exists for ${yesterday}`)
      continue
    }

    // Create survey linked to the longest activity
    const { data: survey, error } = await supabase
      .from('readiness_surveys')
      .insert({ session_id: session.id, activity_id: acts[0].id, survey_date: yesterday })
      .select('id')
      .single()

    if (error || !survey) {
      console.error('Failed to create survey:', error?.message)
      continue
    }

    // Send intro + 5 polls
    await sendText(
      session.whatsapp_group_id!,
      `📋 *Encuesta de readiness* (${trainee.display_name})\nDespués del entrenamiento de ayer, ¿cómo te sientes hoy? Responde las 5 preguntas:`
    )

    for (const q of POLL_QUESTIONS) {
      await sendPoll(
        session.whatsapp_group_id!,
        q.name,
        ['1', '2', '3', '4', '5'],
        1,
        `readiness:${survey.id}:${q.field}`
      )
    }

    surveysSent.push(trainee.display_name)
  }

  return NextResponse.json({ surveys_sent: surveysSent, skipped })
}
