/**
 * MCP Server for MatiTrainer — exposes training data to claude.ai
 * Protocol: JSON-RPC 2.0 / MCP 2024-11-05
 * Transport: Streamable HTTP (POST)
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_activities',
    description:
      'Obtiene actividades de running/trail del atleta (Matias Gutierrez, Chile). ' +
      'Incluye nombre, fecha, distancia (km), ritmo (min/km), tiempo en movimiento (min), ' +
      'frecuencia cardíaca promedio, elevación (m) y puntuación de fatiga.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Días hacia atrás desde hoy (default: 30)' },
        limit: { type: 'number', description: 'Máximo de actividades (default: 20)' },
      },
    },
  },
  {
    name: 'get_training_plan',
    description: 'Obtiene el plan de entrenamiento planificado para el atleta.',
    inputSchema: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'Días hacia adelante desde hoy (default: 56)' },
      },
    },
  },
  {
    name: 'save_training_plan',
    description:
      'Guarda o actualiza días en el plan de entrenamiento. ' +
      'Usa esto para crear o modificar el plan cuando el atleta lo pida. ' +
      'Los días existentes se sobreescriben (upsert por fecha).',
    inputSchema: {
      type: 'object',
      required: ['days'],
      properties: {
        days: {
          type: 'array',
          items: {
            type: 'object',
            required: ['date', 'planned_activity'],
            properties: {
              date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
              planned_activity: { type: 'string', description: 'Descripción de la actividad' },
              distance_km: { type: 'number' },
              session_type: {
                type: 'string',
                enum: ['Recuperación', 'Fácil', 'Medio', 'Largo', 'Largo+', 'Trail', 'Descanso', 'Intervalos'],
              },
              notes: { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'delete_training_plan_days',
    description: 'Elimina días específicos del plan de entrenamiento.',
    inputSchema: {
      type: 'object',
      required: ['dates'],
      properties: {
        dates: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fechas a eliminar en formato YYYY-MM-DD',
        },
      },
    },
  },
  {
    name: 'get_stats',
    description:
      'Resumen de estadísticas: km totales, km esta semana, fatiga promedio, ' +
      'adherencia al plan (últimos 30 días) y las 5 actividades más recientes.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// ─── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>) {
  const todayStr = today()

  if (name === 'get_activities') {
    const days = (args.days as number) ?? 30
    const limit = (args.limit as number) ?? 20
    const from = addDays(todayStr, -days)
    const { data, error } = await supabase
      .from('activities')
      .select('id, name, date, type, distance_km, pace_min_km, moving_time_min, avg_hr, elevation_m, fatigue_score, trainer_notes')
      .gte('date', from)
      .order('date', { ascending: false })
      .limit(limit)
    if (error) return { error: error.message }
    return { today: todayStr, from, activities: data, count: data?.length ?? 0 }
  }

  if (name === 'get_training_plan') {
    const daysAhead = (args.days_ahead as number) ?? 56
    const until = addDays(todayStr, daysAhead)
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .gte('date', todayStr)
      .lte('date', until)
      .order('date')
    if (error) return { error: error.message }
    return { today: todayStr, until, plan: data }
  }

  if (name === 'save_training_plan') {
    const days = args.days as Array<{
      date: string
      planned_activity: string
      distance_km?: number
      session_type?: string
      notes?: string
    }>
    const rows = days.map(d => ({
      date: d.date,
      planned_activity: d.planned_activity,
      distance_km: d.distance_km ?? null,
      session_type: d.session_type ?? null,
      notes: d.notes ?? null,
      source: 'claude_mcp',
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('training_plans').upsert(rows, { onConflict: 'date' })
    if (error) return { error: error.message }
    return { saved: rows.length, dates: days.map(d => d.date) }
  }

  if (name === 'delete_training_plan_days') {
    const dates = args.dates as string[]
    const { error } = await supabase.from('training_plans').delete().in('date', dates)
    if (error) return { error: error.message }
    return { deleted: dates.length, dates }
  }

  if (name === 'get_stats') {
    const d = new Date(todayStr + 'T12:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    const weekStart = d.toISOString().split('T')[0]
    const thirtyDaysAgo = addDays(todayStr, -30)

    const [{ data: allActs }, { data: weekActs }, { data: planRows }] = await Promise.all([
      supabase.from('activities').select('distance_km, fatigue_score, date').order('date', { ascending: false }).limit(100),
      supabase.from('activities').select('distance_km').gte('date', weekStart),
      supabase.from('training_plans').select('date').gte('date', thirtyDaysAgo).lte('date', todayStr),
    ])

    const totalKm = allActs?.reduce((s, a) => s + (a.distance_km || 0), 0) ?? 0
    const weekKm = weekActs?.reduce((s, a) => s + (a.distance_km || 0), 0) ?? 0
    const avgFatigue = allActs?.length
      ? allActs.reduce((s, a) => s + (a.fatigue_score || 0), 0) / allActs.length
      : 0

    const plannedDates = planRows?.map(p => p.date) ?? []
    const completedCount = plannedDates.filter(d => allActs?.some(a => a.date === d)).length
    const adherence = plannedDates.length > 0
      ? Math.round((completedCount / plannedDates.length) * 100)
      : null

    return {
      today: todayStr,
      week_start: weekStart,
      total_km_all_time: Math.round(totalKm),
      week_km: Math.round(weekKm * 10) / 10,
      avg_fatigue_score: Math.round(avgFatigue),
      plan_adherence_last_30d: adherence !== null ? `${adherence}%` : 'sin datos',
      recent_activities: allActs?.slice(0, 5).map(a => ({
        date: a.date,
        km: a.distance_km,
        fatigue: a.fatigue_score,
      })),
    }
  }

  return { error: `Herramienta desconocida: ${name}` }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isAuthorized(_req: NextRequest): boolean {
  return true // personal use — no auth required
}

// ─── JSON-RPC handler ────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function rpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } }, { headers: CORS })
}

function rpcOk(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result }, { headers: CORS })
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  return Response.json({ name: 'matitrainer-mcp', version: '1.0.0', status: 'ok' }, { headers: CORS })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return rpcError(null, -32001, 'Unauthorized')
  }

  let body: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return rpcError(null, -32700, 'Parse error')
  }

  const { id, method, params } = body

  if (method === 'initialize') {
    return rpcOk(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'matitrainer', version: '1.0.0' },
    })
  }

  if (method === 'notifications/initialized') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (method === 'ping') {
    return rpcOk(id, {})
  }

  if (method === 'tools/list') {
    return rpcOk(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = (params ?? {}) as {
      name: string
      arguments?: Record<string, unknown>
    }
    try {
      const result = await executeTool(name, toolArgs ?? {})
      return rpcOk(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      })
    } catch (e) {
      return rpcError(id, -32000, String(e))
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`)
}
