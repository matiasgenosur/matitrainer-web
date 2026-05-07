import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText, sendPoll } from '@/lib/whatsapp-hub'

function yesterdaySantiago(): string {
  const now = new Date()
  const santiago = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  santiago.setDate(santiago.getDate() - 1)
  return santiago.toISOString().split('T')[0]
}

const POLL_QUESTIONS = [
  { field: 'sleep_quality', name: '😴 ¿Qué tan reparador fue tu descanso? (1: Muy malo - 5: Excelente)' },
  { field: 'energy_level', name: '⚡ ¿Cómo te sientes físicamente hoy? (1: Agotado - 5: Lleno de energía)' },
  { field: 'muscle_state', name: '💪 ¿Sientes dolor o rigidez (DOMS)? (1: Dolor intenso - 5: Sin molestias)' },
  { field: 'stress_level', name: '🧠 ¿Nivel de estrés fuera del gym? (1: Muy alto - 5: Muy bajo/Relajado)' },
  { field: 'mood', name: '🔥 ¿Qué tanta motivación tienes para entrenar? (1: Nula - 5: Máxima)' },
]

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const yesterday = yesterdaySantiago()

  // Find Crossfit activities from yesterday
  const { data: crossfitActs } = await supabase
    .from('activities')
    .select('id, name, type, session_type, date')
    .eq('date', yesterday)
    .or('type.ilike.%crossfit%,type.ilike.%weighttraining%,session_type.ilike.%crossfit%')

  if (!crossfitActs || crossfitActs.length === 0) {
    return NextResponse.json({ message: 'No crossfit activities yesterday', date: yesterday })
  }

  // Get active sessions with trainee's Strava athlete ID
  const { data: sessions } = await supabase
    .from('matitrainer_sessions')
    .select(`
      id, whatsapp_group_id,
      trainee:matitrainer_users!trainee_id(display_name, strava_athlete_id)
    `)
    .eq('status', 'active')
    .not('whatsapp_group_id', 'is', null)

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No active sessions' })
  }

  const surveysSent: string[] = []

  for (const session of sessions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trainee = session.trainee as any
    if (!trainee) continue

    // Check if survey already exists
    const { data: existing } = await supabase
      .from('readiness_surveys')
      .select('id')
      .eq('session_id', session.id)
      .eq('survey_date', yesterday)
      .single()

    if (existing) continue

    // Find a crossfit activity (for now, take first one)
    const activityId = crossfitActs[0].id

    // Create survey
    const { data: survey, error } = await supabase
      .from('readiness_surveys')
      .insert({ session_id: session.id, activity_id: activityId, survey_date: yesterday })
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

  return NextResponse.json({
    date: yesterday,
    crossfit_activities: crossfitActs.length,
    surveys_sent: surveysSent,
  })
}
