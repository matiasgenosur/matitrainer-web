export const dynamic = 'force-dynamic'

import { getActivities } from '@/lib/data'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/nav'
import TrainingClient from './training-client'
import { SESSION_TYPE_LABELS } from '@/lib/session-types-ui'
import type { PlannedSessionHydrated } from '@/lib/types'

type LegacyTrainingPlan = {
  date: string
  planned_activity: string
  distance_km?: number
  session_type?: string
  notes?: string
}

async function getTrainingPlans(): Promise<LegacyTrainingPlan[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const from = today
    const until = new Date(today + 'T00:00:00')
    until.setDate(until.getDate() + 56) // 8 weeks ahead
    const to = until.toISOString().split('T')[0]

    // Try new hierarchical model first
    const { data: planned } = await supabase
      .from('planned_sessions')
      .select(
        '*, blocks:workout_blocks(*, items:block_items(*))'
      )
      .gte('date', from)
      .lte('date', to)
      .order('date')

    if (planned && planned.length > 0) {
      return (planned as PlannedSessionHydrated[]).map((p) => {
        const distanceM = (p.blocks ?? []).reduce(
          (acc, b) =>
            acc +
            (b.items ?? []).reduce((s, it) => s + (it.distance_m ?? 0), 0),
          0
        )
        return {
          date: p.date,
          planned_activity: p.name,
          session_type: SESSION_TYPE_LABELS[p.session_type] ?? p.session_type,
          distance_km: distanceM > 0 ? distanceM / 1000 : undefined,
          notes: p.notes ?? undefined,
        }
      })
    }

    // Fallback to legacy table while migration is in flight
    const { data: legacy } = await supabase
      .from('training_plans')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date')
    return (legacy as LegacyTrainingPlan[] | null) ?? []
  } catch {
    return []
  }
}

export default async function TrainingPage() {
  const [activities, trainingPlans] = await Promise.all([getActivities(), getTrainingPlans()])

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plan de Entrenamiento</h1>
          <p className="text-gray-400 text-sm mt-0.5">Generado por Claude · se actualiza desde el chat</p>
        </div>
        <TrainingClient activities={activities} trainingPlans={trainingPlans} />
      </main>
    </div>
  )
}
