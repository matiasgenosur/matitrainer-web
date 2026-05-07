import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyHmac, sendText } from '@/lib/whatsapp-hub'
import { processChat, ChatMessage } from '@/lib/chat-engine'

const PROJECT_ID = process.env.HUB_PROJECT_ID || 'matitrainer'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Poll vote handler ───────────────────────────────────────────────────────

const READINESS_FIELDS = ['sleep_quality', 'energy_level', 'muscle_state', 'stress_level', 'mood'] as const

async function handlePollVote(body: {
  correlation_id?: string
  selected_options?: string[]
  from?: string
}) {
  const { correlation_id, selected_options } = body
  if (!correlation_id || !selected_options?.length) return

  // Parse correlation_id: "readiness:{survey_id}:{field}"
  const parts = correlation_id.split(':')
  if (parts[0] !== 'readiness' || parts.length !== 3) return

  const surveyId = parts[1]
  const field = parts[2]
  if (!READINESS_FIELDS.includes(field as typeof READINESS_FIELDS[number])) return

  const value = parseInt(selected_options[0])
  if (isNaN(value) || value < 1 || value > 5) return

  const supabase = getSupabase()

  // Update the specific field
  const { data: survey, error } = await supabase
    .from('readiness_surveys')
    .update({ [field]: value })
    .eq('id', surveyId)
    .select('*')
    .single()

  if (error || !survey) {
    console.error('Poll vote update error:', error?.message)
    return
  }

  // Check if all fields are filled
  const allFilled = READINESS_FIELDS.every(f => survey[f] != null)
  if (allFilled) {
    const scores = READINESS_FIELDS.map(f => survey[f] as number)
    const readinessScore = Math.round((scores.reduce((a, b) => a + b, 0) / 5) * 100) / 100

    await supabase
      .from('readiness_surveys')
      .update({ readiness_score: readinessScore, completed: true })
      .eq('id', surveyId)

    // Look up team to send summary
    const { data: team } = await supabase
      .from('teams')
      .select('whatsapp_group_id, trainee_name')
      .eq('id', survey.team_id)
      .single()

    if (team) {
      const msg = [
        `✅ *Encuesta de readiness completada* (${team.trainee_name})`,
        `📊 Score: *${readinessScore.toFixed(1)}/5*`,
        `😴 Sueño: ${survey.sleep_quality} | ⚡ Energía: ${survey.energy_level} | 💪 Muscular: ${survey.muscle_state} | 🧠 Estrés: ${survey.stress_level} | 🔥 Ánimo: ${survey.mood}`,
      ].join('\n')
      await sendText(team.whatsapp_group_id, msg)
    }
  }
}

// ─── Chat handler ────────────────────────────────────────────────────────────

async function handleTextMessage(body: {
  chat_id: string
  from_number: string
  from_name: string
  text: string
  is_group: boolean
}) {
  const supabase = getSupabase()

  // Find team by group chat_id
  const { data: team } = await supabase
    .from('teams')
    .select('id, whatsapp_group_id')
    .eq('whatsapp_group_id', body.chat_id)
    .eq('active', true)
    .single()

  if (!team) {
    // Not a registered group, ignore
    return
  }

  // Load recent chat history for this team (WhatsApp channel)
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('team_id', team.id)
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

  // Save user message to history
  await supabase.from('chat_history').insert({
    role: 'user',
    content: `[${body.from_name}]: ${body.text}`,
    channel: 'whatsapp',
    team_id: team.id,
  })

  // Process with chat engine
  const result = await processChat(messages)

  // Save assistant response
  await supabase.from('chat_history').insert({
    role: 'assistant',
    content: result.reply,
    channel: 'whatsapp',
    team_id: team.id,
    actions: result.actionsExecuted.length > 0 ? result.actionsExecuted : null,
  })

  // Send response back to WhatsApp group
  if (result.reply) {
    await sendText(body.chat_id, result.reply)
  }
}

// ─── Webhook POST handler ────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Read raw body for HMAC verification
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
    } catch { /* ignore duplicate insert */ }
  }

  // Log minimal info (no message content)
  console.log(`WA webhook: type=${body.type} from=${body.from_number || body.from} chat=${body.chat_id || '—'}`)

  // Route by type — process async with after()
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

  // Return 200 immediately
  return NextResponse.json({ ok: true })
}
