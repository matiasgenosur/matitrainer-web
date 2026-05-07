import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { verifyHmac, sendText } from '@/lib/whatsapp-hub'
import { processChat, ChatMessage } from '@/lib/chat-engine'

const PROJECT_ID = process.env.HUB_PROJECT_ID || 'matitrainer'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Binding flow ────────────────────────────────────────────────────────────

const BIND_REGEX = /bind_token:\s*(\S+)/i

async function handleBindingMessage(body: {
  chat_id: string
  from_number: string
  text: string
}) {
  const match = body.text.match(BIND_REGEX)
  if (!match) return false

  const rawToken = match[1]
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const supabase = getSupabase()

  // Find valid, unconsumed, non-expired token
  const { data: tokenRow } = await supabase
    .from('matitrainer_bind_tokens')
    .select('id, session_id, consumed, expires_at')
    .eq('token_hash', tokenHash)
    .eq('consumed', false)
    .single()

  if (!tokenRow) {
    await sendText(body.chat_id, '❌ Token inválido o ya consumido.')
    return true
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await sendText(body.chat_id, '❌ Token expirado. Solicita uno nuevo.')
    return true
  }

  // Verify the sender is the trainer of this session
  const { data: session } = await supabase
    .from('matitrainer_sessions')
    .select(`
      id, status,
      trainer:matitrainer_users!trainer_id(display_name, whatsapp_number),
      trainee:matitrainer_users!trainee_id(display_name, whatsapp_number)
    `)
    .eq('id', tokenRow.session_id)
    .single()

  if (!session) {
    await sendText(body.chat_id, '❌ Sesión no encontrada.')
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trainer = session.trainer as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trainee = session.trainee as any

  // Verify sender is a member of this session (trainer or trainee)
  const senderDigits = body.from_number.replace(/\D/g, '')
  const trainerMatch = trainer?.whatsapp_number && senderDigits.includes(trainer.whatsapp_number.replace(/\D/g, ''))
  const traineeMatch = trainee?.whatsapp_number && senderDigits.includes(trainee.whatsapp_number.replace(/\D/g, ''))
  if (!trainerMatch && !traineeMatch) {
    await sendText(body.chat_id, '❌ Solo un miembro registrado de la sesión puede vincular este grupo.')
    return true
  }

  if (session.status === 'revoked') {
    await sendText(body.chat_id, '❌ Esta sesión fue revocada.')
    return true
  }

  // Activate session: set chat_id and status
  await supabase
    .from('matitrainer_sessions')
    .update({
      whatsapp_group_id: body.chat_id,
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  // Consume token
  await supabase
    .from('matitrainer_bind_tokens')
    .update({ consumed: true })
    .eq('id', tokenRow.id)

  await sendText(
    body.chat_id,
    `✅ *Grupo vinculado a MatiTrainer*\n🏋️ Entrenador: ${trainer?.display_name}\n🏃 Atleta: ${trainee?.display_name}\n\nYa pueden interactuar con el bot en este grupo.`
  )

  return true
}

// ─── Session lookup ──────────────────────────────────────────────────────────

async function getActiveSession(chatId: string) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('matitrainer_sessions')
    .select(`
      id, whatsapp_group_id,
      trainer:matitrainer_users!trainer_id(id, display_name),
      trainee:matitrainer_users!trainee_id(id, display_name, strava_athlete_id)
    `)
    .eq('whatsapp_group_id', chatId)
    .eq('status', 'active')
    .single()

  return data
}

// ─── Poll vote handler ───────────────────────────────────────────────────────

const READINESS_FIELDS = ['sleep_quality', 'energy_level', 'muscle_state', 'stress_level', 'mood'] as const

async function handlePollVote(body: {
  correlation_id?: string
  selected_options?: string[]
}) {
  const { correlation_id, selected_options } = body
  if (!correlation_id || !selected_options?.length) return

  const parts = correlation_id.split(':')
  if (parts[0] !== 'readiness' || parts.length !== 3) return

  const surveyId = parts[1]
  const field = parts[2]
  if (!READINESS_FIELDS.includes(field as typeof READINESS_FIELDS[number])) return

  const value = parseInt(selected_options[0])
  if (isNaN(value) || value < 1 || value > 5) return

  const supabase = getSupabase()

  const { data: survey, error } = await supabase
    .from('readiness_surveys')
    .update({ [field]: value })
    .eq('id', surveyId)
    .select('*')
    .single()

  if (error || !survey) return

  const allFilled = READINESS_FIELDS.every(f => survey[f] != null)
  if (allFilled) {
    const scores = READINESS_FIELDS.map(f => survey[f] as number)
    const readinessScore = Math.round((scores.reduce((a, b) => a + b, 0) / 5) * 100) / 100

    await supabase
      .from('readiness_surveys')
      .update({ readiness_score: readinessScore, completed: true })
      .eq('id', surveyId)

    const session = await getActiveSession(survey.session_id)
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trainee = session.trainee as any
      const msg = [
        `✅ *Encuesta de readiness completada* (${trainee?.display_name})`,
        `📊 Score: *${readinessScore.toFixed(1)}/5*`,
        `😴 Sueño: ${survey.sleep_quality} | ⚡ Energía: ${survey.energy_level} | 💪 Muscular: ${survey.muscle_state} | 🧠 Estrés: ${survey.stress_level} | 🔥 Ánimo: ${survey.mood}`,
      ].join('\n')
      await sendText(session.whatsapp_group_id, msg)
    }
  }
}

// ─── Chat handler ────────────────────────────────────────────────────────────

async function handleTextMessage(body: {
  chat_id: string
  from_number: string
  from_name: string
  text: string
}) {
  // Check for binding message first
  if (body.text.includes('bind_token:')) {
    const handled = await handleBindingMessage(body)
    if (handled) return
  }

  // Find active session for this group
  const session = await getActiveSession(body.chat_id)
  if (!session) {
    await sendText(body.chat_id, '⚠️ Este grupo no está vinculado a MatiTrainer. Envía un bind_token para vincularlo.')
    return
  }

  const supabase = getSupabase()

  // Load recent chat history
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('session_id', session.id)
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(20)

  const messages: ChatMessage[] = [
    ...(history || []).reverse().map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: `[${body.from_name}]: ${body.text}` },
  ]

  // Save user message
  await supabase.from('chat_history').insert({
    role: 'user',
    content: `[${body.from_name}]: ${body.text}`,
    channel: 'whatsapp',
    session_id: session.id,
  })

  const result = await processChat(messages)

  // Save assistant response
  await supabase.from('chat_history').insert({
    role: 'assistant',
    content: result.reply,
    channel: 'whatsapp',
    session_id: session.id,
    actions: result.actionsExecuted.length > 0 ? result.actionsExecuted : null,
  })

  if (result.reply) {
    await sendText(body.chat_id, result.reply)
  }
}

// ─── Webhook POST handler ────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rawBody = await request.text()

  // Verify HMAC signature
  const signature = request.headers.get('x-hub-signature') || ''
  if (!verifyHmac(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Verify project ID
  const projectId = request.headers.get('x-hub-project-id')
  if (projectId !== PROJECT_ID) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)

  // Idempotency check
  const messageId = body.hub_message_id || body.message_id
  if (messageId) {
    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('processed_messages')
      .select('hub_message_id')
      .eq('hub_message_id', messageId)
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    try {
      await supabase.from('processed_messages').insert({ hub_message_id: messageId })
    } catch { /* ignore duplicate */ }
  }

  console.log(`WA webhook: type=${body.type} from=${body.from_number || body.from} chat=${body.chat_id || '—'}`)

  const type = body.type || request.headers.get('x-hub-event')

  if (type === 'text' && body.text) {
    after(async () => {
      try {
        await handleTextMessage(body)
      } catch (e) {
        console.error('WA text handler error:', e)
      }
    })
  } else if (type === 'poll_vote') {
    after(async () => {
      try {
        await handlePollVote(body)
      } catch (e) {
        console.error('WA poll_vote handler error:', e)
      }
    })
  }

  return NextResponse.json({ ok: true })
}
