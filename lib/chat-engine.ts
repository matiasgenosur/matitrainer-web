import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const MAX_HR = 180

function todaySantiago(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'save_training_plan',
    description: `Guarda días de entrenamiento planificados en la base de datos.
Úsalo cuando el usuario pide crear, modificar o actualizar su plan de entrenamiento.
Puede guardar uno o varios días a la vez. Los días existentes se sobreescriben (upsert).`,
    input_schema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'array',
          description: 'Lista de días a planificar',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
              planned_activity: { type: 'string', description: 'Descripción del entrenamiento (ej: "Run fácil 10km Z2")' },
              distance_km: { type: 'number', description: 'Distancia en km (opcional)' },
              session_type: { type: 'string', description: 'Tipo: Recuperación, Fácil, Medio, Largo, Largo+, Trail, Descanso' },
              notes: { type: 'string', description: 'Notas adicionales (ritmo objetivo, zonas FC, etc.)' },
            },
            required: ['date', 'planned_activity'],
          },
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'delete_training_plan_days',
    description: 'Elimina días planificados del plan de entrenamiento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dates: {
          type: 'array',
          items: { type: 'string', description: 'Fecha YYYY-MM-DD' },
          description: 'Fechas a eliminar del plan',
        },
      },
      required: ['dates'],
    },
  },
  {
    name: 'add_activity_note',
    description: `Agrega una nota del entrenador a una actividad completada.
Úsalo cuando el usuario pide comentar, anotar o evaluar una actividad específica.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        activity_id: { type: 'number', description: 'ID de la actividad en Strava/Supabase' },
        note: { type: 'string', description: 'Nota o comentario del entrenador' },
        rpe: { type: 'number', description: 'RPE percibido 1-10 (opcional)' },
      },
      required: ['activity_id', 'note'],
    },
  },
  {
    name: 'create_race_goal',
    description: 'Crea o actualiza una meta de carrera.',
    input_schema: {
      type: 'object' as const,
      properties: {
        race_name: { type: 'string' },
        race_date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        distance_km: { type: 'number' },
        target_time_min: { type: 'number', description: 'Tiempo objetivo en minutos (opcional)' },
        notes: { type: 'string' },
      },
      required: ['race_name', 'race_date', 'distance_km'],
    },
  },
  {
    name: 'get_training_plan',
    description: 'Consulta el plan de entrenamiento guardado (próximas semanas).',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_ahead: { type: 'number', description: 'Cuántos días adelante consultar (default: 14)' },
      },
    },
  },
]

// ─── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const supabase = getSupabase()

  if (name === 'save_training_plan') {
    const days = input.days as Array<{
      date: string; planned_activity: string; distance_km?: number; session_type?: string; notes?: string
    }>
    const { error } = await supabase.from('training_plans').upsert(
      days.map(d => ({ ...d, source: 'claude', updated_at: new Date().toISOString() })),
      { onConflict: 'date' }
    )
    if (error) return `Error: ${error.message}`
    return `Plan guardado para ${days.length} día(s): ${days.map(d => d.date).join(', ')}`
  }

  if (name === 'delete_training_plan_days') {
    const dates = input.dates as string[]
    const { error } = await supabase.from('training_plans').delete().in('date', dates)
    if (error) return `Error: ${error.message}`
    return `Eliminados ${dates.length} día(s) del plan`
  }

  if (name === 'add_activity_note') {
    const { activity_id, note, rpe } = input as { activity_id: number; note: string; rpe?: number }
    const updates: Record<string, unknown> = { trainer_notes: note }
    if (rpe) updates.rpe = rpe
    const { error } = await supabase.from('activities').update(updates).eq('id', activity_id)
    if (error) return `Error: ${error.message}`
    return `Nota guardada en actividad ${activity_id}`
  }

  if (name === 'create_race_goal') {
    const { error } = await supabase.from('race_goals').insert(input)
    if (error) return `Error: ${error.message}`
    return `Meta de carrera "${input.race_name}" creada para ${input.race_date}`
  }

  if (name === 'get_training_plan') {
    const daysAhead = (input.days_ahead as number) || 14
    const today = todaySantiago()
    const until = addDays(today, daysAhead)
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .gte('date', today)
      .lte('date', until)
      .order('date')
    if (error) return `Error: ${error.message}`
    if (!data?.length) return 'No hay plan guardado para los próximos días.'
    return JSON.stringify(data)
  }

  return 'Herramienta desconocida'
}

// ─── Context builder ─────────────────────────────────────────────────────────

function buildContext(activities: Record<string, unknown>[], plans: Record<string, unknown>[]): string {
  const today = todaySantiago()
  const sorted = [...activities].sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const weekAgo = addDays(today, -7)
  const weeklyKm = sorted
    .filter(a => String(a.date) >= weekAgo && String(a.type) === 'Run')
    .reduce((s, a) => s + Number(a.distance_km), 0)

  const loadByDay = new Map<string, number>()
  sorted.forEach(a => {
    const key = String(a.date)
    loadByDay.set(key, (loadByDay.get(key) || 0) + Number(a.suffer_score || 0))
  })
  let acute = 0, chronic = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - i)
    acute += loadByDay.get(d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })) || 0
  }
  for (let i = 0; i < 28; i++) {
    const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - i)
    chronic += loadByDay.get(d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })) || 0
  }
  chronic = chronic / 4
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0

  const last = sorted[0]
  const daysSince = last
    ? Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(String(last.date) + 'T00:00:00').getTime()) / 86400000)
    : null

  const recentSummary = sorted.slice(0, 10).map(a => {
    const km = Number(a.distance_km).toFixed(1)
    const pace = a.pace_min_km ? `${Math.floor(Number(a.pace_min_km))}:${Math.round((Number(a.pace_min_km) % 1) * 60).toString().padStart(2, '0')}/km` : ''
    const hr = a.avg_hr ? `FC:${a.avg_hr}bpm` : ''
    return `  [id:${a.id}] ${a.date} | ${a.type} | ${a.name} | ${km}km ${pace} ${hr}`.trim()
  }).join('\n')

  const planSummary = plans.length > 0
    ? plans.map(p => `  ${p.date}: ${p.planned_activity}${p.notes ? ` (${p.notes})` : ''}`).join('\n')
    : '  (sin plan guardado aún)'

  const avgHR = last?.avg_hr ? Number(last.avg_hr) : null
  const hrPct = avgHR ? Math.round((avgHR / MAX_HR) * 100) : null

  return `## Estado actual (${today})
- Días desde última actividad: ${daysSince ?? 'N/A'}
- Última: ${last ? `${last.name} (${last.type}, ${Number(last.distance_km).toFixed(1)}km, ${last.date})` : 'N/A'}
- Km esta semana (running): ${Math.round(weeklyKm * 10) / 10}km
- ACWR: ${acwr} ${acwr < 0.8 ? '(carga baja)' : acwr > 1.5 ? '(riesgo lesión)' : acwr > 1.3 ? '(precaución)' : '(óptimo)'}
${hrPct ? `- FC última actividad: ${avgHR}bpm (${hrPct}% FCmax ${MAX_HR})` : ''}
- Total actividades históricas: ${activities.length}

## Últimas 10 actividades (incluye id para anotar)
${recentSummary}

## Plan de entrenamiento guardado (próximos días)
${planSummary}`
}

// ─── Main chat function ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResult {
  reply: string
  actionsExecuted: string[]
  refreshNeeded: boolean
}

export async function processChat(messages: ChatMessage[]): Promise<ChatResult> {
  const supabase = getSupabase()
  const today = todaySantiago()

  const [activitiesRes, plansRes] = await Promise.all([
    supabase.from('activities')
      .select('id,name,type,date,distance_km,moving_time_min,pace_min_km,avg_hr,suffer_score,elevation_m,session_type')
      .order('date', { ascending: false }).limit(60),
    supabase.from('training_plans')
      .select('*').gte('date', today).order('date').limit(30),
  ])

  const context = buildContext(
    (activitiesRes.data || []) as Record<string, unknown>[],
    (plansRes.data || []) as Record<string, unknown>[]
  )

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const system = `Eres MatiBot, el asistente de entrenamiento personal de Matias Gutierrez, corredor de trail y montaña en Chile.

Puedes responder preguntas Y ejecutar acciones reales en el sistema:
- Guardar/modificar el plan de entrenamiento semanal
- Eliminar días del plan
- Agregar notas a actividades completadas
- Crear metas de carrera

Cuando el usuario pide cambiar su plan, crear un entrenamiento, o ejecutar cualquier acción, USA LAS HERRAMIENTAS disponibles para hacerlo realmente — no solo describas lo que harías.

${context}

Reglas:
- Responde siempre en español
- Sé concreto y usa los datos reales
- Para planes, considera siempre el ACWR y la fatiga actual
- FC máxima de Matias: ${MAX_HR}bpm
- Zona 1: <60% FCmax, Zona 2: 60-70%, Zona 3: 70-80%, Zona 4: 80-90%, Zona 5: >90%
- Fórmula de Riegel para predicción: T2 = T1 × (D2/D1)^1.06
- Cuando guardes un plan, confirma qué días guardaste`

  const loopMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  const actionsExecuted: string[] = []
  let finalText = ''
  let iterations = 0

  while (iterations < 5) {
    iterations++
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system,
      tools: TOOLS,
      messages: loopMessages,
    })

    if (response.stop_reason === 'end_turn') {
      finalText = (response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined)?.text || ''
      break
    }

    if (response.stop_reason === 'tool_use') {
      loopMessages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input as Record<string, unknown>)
          actionsExecuted.push(block.name)
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
        }
      }
      loopMessages.push({ role: 'user', content: toolResults })
    } else {
      finalText = (response.content.find(b => b.type === 'text') as Anthropic.TextBlock | undefined)?.text || ''
      break
    }
  }

  return {
    reply: finalText,
    actionsExecuted,
    refreshNeeded: actionsExecuted.length > 0,
  }
}
