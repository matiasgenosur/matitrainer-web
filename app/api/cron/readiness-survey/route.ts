import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText, sendPoll } from '@/lib/whatsapp-hub'

function yesterdaySantiago(): string {
  const now = new Date()
  // Santiago is UTC-4 (CLT) or UTC-3 (CLST)
  const santiago = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }))
  santiago.setDate(santiago.getDate() - 1)
  return santiago.toISOString().split('T')[0]
}

const POLL_QUESTIONS = [
  {
    field: 'sleep_quality',
    name: '😴 ¿Qué tan reparador fue tu descanso? (1: Muy malo - 5: Excelente)',
  },
  {
    field: 'energy_level',
    name: '⚡ ¿Cómo te sientes físicamente hoy? (1: Agotado - 5: Lleno de energía)',
  },
  {
    field: 'muscle_state',
    name: '💪 ¿Sientes dolor o rigidez (DOMS)? (1: Dolor intenso - 5: Sin molestias)',
  },
  {
    field: 'stress_level',
    name: '🧠 ¿Nivel de estrés fuera del gym? (1: Muy alto - 5: Muy bajo/Relajado)',
  },
  {
    field: 'mood',
    name: '🔥 ¿Qué tanta motivación tienes para entrenar? (1: Nula - 5: Máxima)',
  },
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

  // Get all active teams
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('active', true)

  if (!teams || teams.length === 0) {
    return NextResponse.json({ message: 'No active teams' })
  }

  const surveysSent: string[] = []

  for (const team of teams) {
    // Check if any of yesterday's crossfit activities belong to this team's trainee
    // For now, we send to all active teams if there's a crossfit activity
    // In multi-tenant: filter by trainee_strava_athlete_id

    // Check if survey already exists for this team + date
    const { data: existing } = await supabase
      .from('readiness_surveys')
      .select('id')
      .eq('team_id', team.id)
      .eq('survey_date', yesterday)
      .single()

    if (existing) continue

    // Create survey record
    const activityId = crossfitActs[0].id
    const { data: survey, error } = await supabase
      .from('readiness_surveys')
      .insert({
        team_id: team.id,
        activity_id: activityId,
        survey_date: yesterday,
      })
      .select('id')
      .single()

    if (error || !survey) {
      console.error('Failed to create survey:', error?.message)
      continue
    }

    // Send intro message
    await sendText(
      team.whatsapp_group_id,
      `📋 *Encuesta de readiness* (${team.trainee_name})\nDespués del entrenamiento de ayer, ¿cómo te sientes hoy? Responde las 5 preguntas:`
    )

    // Send 5 polls
    for (const q of POLL_QUESTIONS) {
      await sendPoll(
        team.whatsapp_group_id,
        q.name,
        ['1', '2', '3', '4', '5'],
        1,
        `readiness:${survey.id}:${q.field}`
      )
    }

    surveysSent.push(team.trainee_name)
  }

  return NextResponse.json({
    date: yesterday,
    crossfit_activities: crossfitActs.length,
    surveys_sent: surveysSent,
  })
}
